import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import GlossyIcon from '../components/GlossyIcon';
import { api } from '../api/client';

export default function AIChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load chat history
    api.getChatHistory('default')
      .then(history => {
        if (history.length === 0) {
          // Welcome greeting
          setMessages([
            {
              role: 'assistant',
              content: "Greetings. I am your AI Planning Assistant powered by local intelligence. I can help you prioritize responsibilities, generate optimized daily timetables, inspect deadlines, or dynamically reschedule tasks. How can I assist your workflow today?",
              suggested_followups: [
                "What should I do first today?",
                "Show my pending tasks",
                "Prepare a timetable for tomorrow",
                "How much free time do I have today?"
              ]
            }
          ]);
        } else {
          setMessages(history);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || isSending) return;

    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await api.sendChatMessage(text, 'default');
      const aiMsg = {
        role: 'assistant',
        content: response.response,
        intent: response.intent,
        action_taken: response.action_taken,
        suggested_followups: response.suggested_followups || [],
        created_at: response.created_at
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I apologize, but I encountered an error communicating with the planning engine. Please ensure your backend service is running.",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear conversation history?')) return;
    try {
      await api.clearChatHistory('default');
      setMessages([
        {
          role: 'assistant',
          content: "Conversation history cleared. What would you like to plan next?",
          suggested_followups: [
            "What should I do first today?",
            "Show my pending tasks",
            "Prepare a timetable for tomorrow"
          ]
        }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const samplePrompts = [
    "What should I do first today?",
    "Show my pending tasks",
    "Which tasks are overdue?",
    "Prepare a timetable for tomorrow",
    "How much free time do I have today?",
    "Add a task to complete AI assignment tomorrow"
  ];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto w-full">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-soft-border/80 shrink-0">
        <div className="flex items-center gap-3">
          <GlossyIcon icon={Bot} variant="burgundy" size={20} containerSize="w-10 h-10" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-dark-charcoal flex items-center gap-2">
              AI Planning Assistant
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-burgundy/15 text-burgundy font-sans font-bold border border-burgundy/30">
                Llama 3.2 + Deterministic Core
              </span>
            </h1>
            <p className="text-xs text-muted-brown">
              Multi-turn conversational planning connected directly to your SQLite database
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          className="p-2 rounded-xl text-muted-brown hover:text-red-700 hover:bg-red-50 border border-soft-border transition-all"
          title="Clear conversation history"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-5 pr-2">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`}
            >
              <GlossyIcon
                icon={isUser ? User : Bot}
                variant={isUser ? 'gold' : 'burgundy'}
                size={16}
                containerSize="w-8 h-8"
              />

              <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-gradient-to-r from-deep-wine to-burgundy text-soft-ivory rounded-tr-none'
                      : 'bg-soft-ivory border border-soft-border text-dark-charcoal rounded-tl-none whitespace-pre-line'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Suggested Follow-up chips for Assistant */}
                {!isUser && msg.suggested_followups?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggested_followups.map((followup, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(followup)}
                        className="text-[11px] px-3 py-1 rounded-full bg-warm-beige/80 hover:bg-soft-border text-deep-wine border border-burgundy/25 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <span>{followup}</span>
                        <ArrowRight size={10} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex items-center gap-3 animate-fade-in">
            <GlossyIcon icon={Bot} variant="burgundy" size={16} containerSize="w-8 h-8" />
            <div className="p-3.5 rounded-2xl bg-soft-ivory border border-soft-border text-xs text-muted-brown flex items-center gap-2 shadow-sm">
              <Sparkles size={14} className="animate-spin text-burgundy" />
              <span>Analyzing constraints and consulting planning engine...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sample Query Shortcuts */}
      <div className="pt-2 pb-2 flex flex-wrap gap-1.5 items-center shrink-0">
        <span className="text-[11px] text-muted-brown font-medium">Quick Queries:</span>
        {samplePrompts.slice(0, 3).map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-soft-ivory hover:bg-warm-beige text-dark-charcoal border border-soft-border transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 shrink-0"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tasks, timetables, recommendations or priorities..."
            className="w-full pl-5 pr-14 py-3.5 rounded-2xl bg-soft-ivory border border-soft-border focus:border-burgundy focus:ring-1 focus:ring-burgundy outline-none text-sm text-dark-charcoal shadow-sm"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="absolute right-2.5 p-2 rounded-xl btn-burgundy text-soft-ivory disabled:opacity-40 transition-all"
            title="Send Message"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
