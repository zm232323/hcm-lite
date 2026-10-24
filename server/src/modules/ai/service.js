'use strict';
const { AiLog, Employee, LeaveType, LeaveRequest } = require('../../models');
const { generate, FALLBACK_RESPONSE } = require('./llm');
const { buildPolicyText } = require('./policy');
const { buildChatSystemPrompt, buildSummarySystemPrompt, buildSmartLeaveSystemPrompt } = require('./prompts');
const { TOOL_DEFINITIONS, executeTool } = require('./tools');
const { smartLeaveOutputSchema } = require('./validation');
const { getDashboardData } = require('../dashboards/service');
const { countWorkingDays } = require('../attendance/service');
const { getLeaveBalance } = require('../leave/service');
const { getKarachiNow } = require('../../utils/time');
const { forbidden, rateLimited } = require('../../utils/httpError');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Checks rate limits (20 AI calls/user/hour)
 * Returns { allowed: boolean, count: number, retryAfterMinutes?: number }
 */
async function checkRateLimit(userId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await AiLog.countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo },
  });

  if (count >= 20) {
    // Find the oldest log in this window to compute retryAfterMinutes
    const oldest = await AiLog.findOne({
      userId,
      createdAt: { $gte: oneHourAgo },
    })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean();

    const elapsedMs = oldest ? Date.now() - new Date(oldest.createdAt).getTime() : 0;
    const retryAfterMs = Math.max(60000, 60 * 60 * 1000 - elapsedMs);
    const retryAfterMinutes = Math.ceil(retryAfterMs / 60000);

    return { allowed: false, count, retryAfterMinutes };
  }

  return { allowed: true, count };
}

/**
 * Helper to record AiLog safely (never throws)
 */
async function recordAiLog({ userId, role, feature, question, toolsCalled, status, latencyMs, tokenUsage, errorMessage }) {
  try {
    await AiLog.create({
      userId,
      role,
      feature,
      question: (question || '').slice(0, 500),
      toolsCalled: toolsCalled || [],
      status,
      latencyMs: latencyMs || 0,
      tokenUsage: tokenUsage || undefined,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 200) : null,
    });
  } catch (err) {
    console.error('[AiLog Error]', err.message);
  }
}

/**
 * Chat Assistant
 * @param {Object} options
 * @param {Object} options.user - Authenticated user { _id, role, name }
 * @param {string} options.message
 * @param {Array} [options.history]
 */
async function chat({ user, message, history = [] }) {
  const startTime = Date.now();
  const { allowed, retryAfterMinutes } = await checkRateLimit(user._id);

  if (!allowed) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'chat',
      question: message,
      status: 'rate_limited',
      errorMessage: 'Rate limit of 20 requests per hour exceeded',
    });

    throw rateLimited(
      `Rate limit exceeded: You can make at most 20 AI requests per hour. Please try again in about ${retryAfterMinutes} minutes.`,
      retryAfterMinutes
    );
  }

  // Resolve caller employeeId
  const emp = await Employee.findOne({ userId: user._id }).select('_id').lean();
  const employeeId = emp ? emp._id.toString() : null;

  const { todayStr } = getKarachiNow();
  const dayOfWeek = DAY_NAMES[new Date(todayStr + 'T12:00:00Z').getUTCDay()];
  const policyText = await buildPolicyText();

  const systemPrompt = buildChatSystemPrompt({
    userName: user.name,
    userRole: user.role,
    policyText,
    todayStr,
    dayOfWeek,
  });

  // Prepare initial message history (capped at 6 items, sanitized)
  const formattedMessages = (history || []).slice(-6).map((h) => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    content: String(h.content || '').slice(0, 2000),
  }));
  formattedMessages.push({ role: 'user', content: String(message || '').slice(0, 2000) });

  const toolsCalled = [];
  let round = 0;
  let finalAnswer = '';
  let tokenUsage = null;
  let lastResponse = null;

  while (round < 3) {
    round++;

    lastResponse = await generate({
      systemPrompt,
      messages: formattedMessages,
      tools: TOOL_DEFINITIONS,
    });

    if (lastResponse.fallback) {
      const latency = Date.now() - startTime;
      await recordAiLog({
        userId: user._id,
        role: user.role,
        feature: 'chat',
        question: message,
        toolsCalled,
        status: 'error',
        latencyMs: latency,
        errorMessage: 'Provider error or timeout fallback returned',
      });

      return {
        answer: lastResponse.message,
        toolsCalled,
        aiGenerated: true,
        fallback: true,
      };
    }

    if (lastResponse.tokenUsage) {
      tokenUsage = lastResponse.tokenUsage;
    }

    // Check if model called function(s)
    if (lastResponse.functionCalls && lastResponse.functionCalls.length > 0) {
      for (const call of lastResponse.functionCalls) {
        toolsCalled.push(call.name);

        const toolResult = await executeTool(call.name, call.args || {}, {
          userId: user._id,
          role: user.role,
          employeeId,
        });

        // Add model's tool call & tool's result to conversation
        formattedMessages.push({
          role: 'model',
          functionCall: {
            name: call.name,
            args: call.args || {},
          },
        });

        formattedMessages.push({
          role: 'function',
          functionResponse: {
            name: call.name,
            response: toolResult,
          },
        });
      }
      // Loop to next round so model can interpret tool result
    } else {
      // Model responded with text directly
      finalAnswer = lastResponse.text || '';
      break;
    }
  }

  // If reached round 3 with function calls but no text, force final answer
  if (!finalAnswer) {
    const forced = await generate({
      systemPrompt,
      messages: formattedMessages,
      tools: null, // No tools so model must synthesize answer
    });
    finalAnswer = forced.text || 'I have analyzed the records according to company policies.';
  }

  const latency = Date.now() - startTime;
  await recordAiLog({
    userId: user._id,
    role: user.role,
    feature: 'chat',
    question: message,
    toolsCalled,
    status: 'ok',
    latencyMs: latency,
    tokenUsage,
  });

  return {
    answer: finalAnswer,
    toolsCalled,
    aiGenerated: true,
  };
}

/**
 * Executive & HR KPI Summary Generator
 * @param {Object} options
 * @param {Object} options.user
 * @param {Object} options.query - Filters { from, to, departmentId }
 */
async function generateSummary({ user, query = {} }) {
  if (user.role === 'employee') {
    throw forbidden('Employees are not authorized to access executive summaries');
  }

  const startTime = Date.now();
  const { allowed, retryAfterMinutes } = await checkRateLimit(user._id);

  if (!allowed) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'summary',
      question: `KPI Summary (${user.role})`,
      status: 'rate_limited',
      errorMessage: 'Rate limit exceeded',
    });

    throw rateLimited(
      `Rate limit exceeded: You can make at most 20 AI requests per hour. Please try again in about ${retryAfterMinutes} minutes.`,
      retryAfterMinutes
    );
  }

  // Fetch real KPI data via universal Part 5 dispatcher
  const dashboardData = await getDashboardData(user.role, query, user._id);
  const systemPrompt = buildSummarySystemPrompt(user.role, dashboardData);

  const response = await generate({
    systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Please summarize the 3 to 5 key highlights from the KPI JSON.',
      },
    ],
  });

  const latency = Date.now() - startTime;

  if (response.fallback) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'summary',
      question: `KPI Summary (${user.role})`,
      status: 'error',
      latencyMs: latency,
      errorMessage: 'Provider error or timeout fallback returned',
    });

    return {
      bullets: [response.message],
      aiGenerated: true,
      fallback: true,
    };
  }

  // Parse text into bullet points
  const rawText = response.text || '';
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 0);

  const bullets = lines.length > 0 ? lines.slice(0, 5) : ['Workforce metrics analyzed successfully.'];

  await recordAiLog({
    userId: user._id,
    role: user.role,
    feature: 'summary',
    question: `KPI Summary (${user.role})`,
    status: 'ok',
    latencyMs: latency,
    tokenUsage: response.tokenUsage,
  });

  return {
    bullets,
    aiGenerated: true,
  };
}

/**
 * Natural language leave parser (Smart Leave)
 * @param {Object} options
 * @param {Object} options.user
 * @param {string} options.text
 */
async function smartLeave({ user, text }) {
  const startTime = Date.now();
  const { allowed, retryAfterMinutes } = await checkRateLimit(user._id);

  if (!allowed) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'smart_leave',
      question: text,
      status: 'rate_limited',
      errorMessage: 'Rate limit exceeded',
    });

    throw rateLimited(
      `Rate limit exceeded: You can make at most 20 AI requests per hour. Please try again in about ${retryAfterMinutes} minutes.`,
      retryAfterMinutes
    );
  }

  // User must have an employee record to apply for leave
  const emp = await Employee.findOne({ userId: user._id }).select('_id name employeeCode').lean();
  if (!emp) {
    throw forbidden('An active employee profile is required to apply for leave');
  }

  const { todayStr } = getKarachiNow();
  const dayOfWeek = DAY_NAMES[new Date(todayStr + 'T12:00:00Z').getUTCDay()];
  const activeTypes = await LeaveType.find({ isActive: true }).lean();

  const systemPrompt = buildSmartLeaveSystemPrompt({
    todayStr,
    dayOfWeek,
    activeLeaveTypes: activeTypes.map((t) => t.name),
  });

  const runParser = async (promptOverride) => {
    return generate({
      systemPrompt,
      messages: [{ role: 'user', content: promptOverride || text }],
      jsonMode: true,
    });
  };

  let response = await runParser();
  let parsedJson = null;

  try {
    if (response.text) {
      parsedJson = JSON.parse(response.text);
      smartLeaveOutputSchema.parse(parsedJson);
    }
  } catch (err) {
    // Retry once with a corrective message
    const correctivePrompt = `The previous extraction failed. Please extract the leave request from: "${text}". Output strictly JSON: { "type": "<leave_type>", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "reason": "<reason>" }`;
    const retryResponse = await runParser(correctivePrompt);

    try {
      if (retryResponse.text) {
        parsedJson = JSON.parse(retryResponse.text);
        smartLeaveOutputSchema.parse(parsedJson);
        response = retryResponse;
      }
    } catch (retryErr) {
      parsedJson = null;
    }
  }

  const latency = Date.now() - startTime;

  if (!parsedJson || response.fallback) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'smart_leave',
      question: text,
      status: 'error',
      latencyMs: latency,
      errorMessage: 'Failed to extract valid smart leave JSON',
    });

    return {
      ok: false,
      message: 'Could not understand. Please fill the form manually.',
    };
  }

  // Match extracted type to active leave types case-insensitively
  const matchedType = activeTypes.find(
    (t) => t.name.toLowerCase() === parsedJson.type.toLowerCase() ||
           t.name.toLowerCase().includes(parsedJson.type.toLowerCase())
  );

  if (!matchedType) {
    await recordAiLog({
      userId: user._id,
      role: user.role,
      feature: 'smart_leave',
      question: text,
      status: 'refused',
      latencyMs: latency,
      errorMessage: `Unrecognized leave type: ${parsedJson.type}`,
    });

    return {
      ok: false,
      message: `Could not identify leave type "${parsedJson.type}". Please select your leave type manually.`,
    };
  }

  // Run existing leave preview logic without saving any records
  const workingDays = await countWorkingDays(parsedJson.start, parsedJson.end);
  const balances = await getLeaveBalance(emp._id);
  const matchedBal = balances.find((b) => b.leaveTypeId.toString() === matchedType._id.toString());
  const remaining = matchedBal?.remaining ?? 0;

  // Check for conflicts
  let conflictReason = null;
  const overlap = await LeaveRequest.findOne({
    employeeId: emp._id,
    status: { $in: ['pending', 'approved'] },
    startDate: { $lte: parsedJson.end },
    endDate: { $gte: parsedJson.start },
  }).lean();

  if (overlap) {
    conflictReason = `Overlaps with existing ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`;
  } else if (matchedType.yearlyQuota !== null && workingDays > remaining) {
    conflictReason = `Requested days (${workingDays}) exceed remaining balance (${remaining})`;
  }

  await recordAiLog({
    userId: user._id,
    role: user.role,
    feature: 'smart_leave',
    question: text,
    status: 'ok',
    latencyMs: latency,
    tokenUsage: response.tokenUsage,
  });

  return {
    ok: true,
    form: {
      leaveTypeId: matchedType._id,
      type: matchedType.name,
      start: parsedJson.start,
      end: parsedJson.end,
      reason: parsedJson.reason,
    },
    preview: {
      workingDays,
      remainingBalance: remaining,
      conflict: conflictReason,
    },
    aiGenerated: true,
  };
}

module.exports = {
  chat,
  generateSummary,
  smartLeave,
  checkRateLimit,
};
