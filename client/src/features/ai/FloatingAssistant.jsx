import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const STARTER_CHIPS = {
  admin: [
    'Who is on leave today?',
    'Who came late most often this month?',
    "What is this month's attendance rate?",
    'How many active employees are in Engineering?',
    'What is the company leave policy?',
  ],
  hr: [
    'Who is on leave today?',
    'Who came late most often this month?',
    "What is this month's attendance rate?",
    'How many active employees are in Engineering?',
    'What is the late rule?',
  ],
  employee: [
    'How many sick leaves do I have left this year?',
    'What is my leave balance?',
    'What is the late rule?',
    'What was my last payslip net salary?',
  ],
};

export function FloatingAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const chips = STARTER_CHIPS[user?.role] || STARTER_CHIPS.employee;

  // Listen for external trigger events (e.g. from Employee Dashboard)
  useEffect(() => {
    const handleOpenWithQuestion = (e) => {
      setOpen(true);
      if (e.detail?.question) {
        handleSendMessage(e.detail.question);
      }
    };
    window.addEventListener('open-ai-chat', handleOpenWithQuestion);
    return () => window.removeEventListener('open-ai-chat', handleOpenWithQuestion);
  }, [messages]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSendMessage = async (textToSend) => {
    const message = (textToSend || input).trim();
    if (!message || loading) return;

    setError(null);
    setInput('');

    const newMessages = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Send history turns (capped at 6 items, sanitized)
      const history = newMessages.slice(-6, -1).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await api.post('/ai/chat', {
        message,
        history,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          toolsCalled: res.data.toolsCalled || [],
          fallback: res.data.fallback,
        },
      ]);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'The assistant is currently unavailable. Please try again later.';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: msg,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      <button
        id="open-ai-assistant-btn"
        onClick={() => setOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-5 w-5 animate-pulse" />
        <span className="hidden sm:inline">AI Assistant</span>
      </button>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over chat drawer */}
      <div
        id="ai-assistant-drawer"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] border-l border-border bg-card shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground">HCM Lite Assistant</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  AI-powered
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ask attendance, leaves, payroll & policy questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="new-chat-btn"
              title="Reset conversation"
              onClick={handleResetChat}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              id="close-chat-btn"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Hello, {user.name?.split(' ')[0]} 👋
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  I can analyze real attendance records, explain company policies, or check your balances.
                </p>
              </div>

              {/* Starter chips */}
              <div className="pt-2 text-left space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Suggested queries
                </p>
                <div className="flex flex-col gap-1.5">
                  {chips.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(chip)}
                      className="w-full text-left rounded-xl border border-border bg-background/60 p-2.5 text-xs text-foreground/90 hover:bg-accent hover:border-primary/40 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate">{chip}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-1.5 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : m.isError
                      ? 'border border-destructive/30 bg-destructive/10 text-destructive rounded-tl-sm'
                      : 'border border-border bg-card text-foreground rounded-tl-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {m.role === 'assistant' && !m.isError && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                        <Sparkles className="h-2.5 w-2.5" /> AI-generated
                      </span>
                      {m.toolsCalled && m.toolsCalled.length > 0 && (
                        <span>• from {m.toolsCalled.join(', ')}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground flex items-center gap-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span>Consulting company records...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="border-t border-border p-3 bg-muted/20 space-y-2">
          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="ai-chat-input"
              type="text"
              placeholder="Ask attendance, leave, policy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <button
              id="send-ai-chat-btn"
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-xl bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
            <span>Confidential & read-only</span>
            <span>Asia/Karachi</span>
          </div>
        </div>
      </div>
    </>
  );
}
