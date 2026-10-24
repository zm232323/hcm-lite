'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Allow injecting a mock generator for testing
let customMockGenerator = null;

function setMockGenerator(fn) {
  customMockGenerator = fn;
}

function clearMockGenerator() {
  customMockGenerator = null;
}

const FALLBACK_RESPONSE = {
  fallback: true,
  message: 'The assistant is unavailable right now. Please use the dashboard or the normal form.',
};

/**
 * Single entry-point for LLM generation
 * @param {Object} options
 * @param {string} options.systemPrompt
 * @param {Array<{role: string, content: string, functionCall?: any, functionResponse?: any}>} options.messages
 * @param {Array} [options.tools] - Function declarations
 * @param {boolean} [options.jsonMode=false]
 * @returns {Promise<{text?: string, functionCalls?: Array<{name: string, args: any}>, fallback?: boolean, message?: string, tokenUsage?: any}>}
 */
async function generate({ systemPrompt, messages = [], tools = null, jsonMode = false }) {
  if (customMockGenerator) {
    return customMockGenerator({ systemPrompt, messages, tools, jsonMode });
  }

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return FALLBACK_RESPONSE;
  }

  const modelName = process.env.AI_MODEL || 'gemini-1.5-flash';

  // Format messages into Gemini contents structure
  const contents = messages.map((m) => {
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';

    if (m.functionCall) {
      return {
        role: 'model',
        parts: [{ functionCall: m.functionCall }],
      };
    }

    if (m.functionResponse) {
      return {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: m.functionResponse.name,
              response: m.functionResponse.response,
            },
          },
        ],
      };
    }

    return {
      role,
      parts: [{ text: String(m.content || '') }],
    };
  });

  const performCall = async () => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelConfig = {
      model: modelName,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    };

    if (tools && tools.length > 0) {
      modelConfig.tools = [{ functionDeclarations: tools }];
    }

    const generationConfig = {};
    if (jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const model = genAI.getGenerativeModel(modelConfig, { apiVersion: 'v1beta' });

    // 15-second timeout via Promise.race
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('AI request timed out');
        err.name = 'TimeoutError';
        reject(err);
      }, 15000);
    });

    try {
      const responsePromise = model.generateContent({
        contents,
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined,
      });

      const result = await Promise.race([responsePromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const response = result.response;
      const fnCalls = response.functionCalls ? response.functionCalls() : null;

      let text = '';
      try {
        text = response.text();
      } catch (e) {
        // May throw if response is purely function call
      }

      const tokenUsage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount,
          }
        : null;

      return {
        text,
        functionCalls: fnCalls && fnCalls.length > 0 ? fnCalls : null,
        tokenUsage,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Execute with at most 1 retry for transient errors
  try {
    return await performCall();
  } catch (err) {
    const isTransient =
      err.name === 'TimeoutError' ||
      (err.status && (err.status === 429 || err.status >= 500)) ||
      (err.message && (err.message.includes('429') || err.message.includes('503')));

    if (isTransient) {
      try {
        // Wait 500ms before single retry
        await new Promise((r) => setTimeout(r, 500));
        return await performCall();
      } catch (retryErr) {
        return FALLBACK_RESPONSE;
      }
    }

    return FALLBACK_RESPONSE;
  }
}

module.exports = {
  generate,
  setMockGenerator,
  clearMockGenerator,
  FALLBACK_RESPONSE,
};
