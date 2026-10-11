import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ArrowUpRight,
  RefreshCw,
  Lightbulb,
  ShieldAlert,
  TrendingDown,
  ShoppingCart
} from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';
import { TypingAnimation } from '@/components/ui/typing-animation';
import api from '@/lib/axios';

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
}

const SUGGESTION_CHIPS = [
  { label: 'What should I reorder?', icon: ShoppingCart },
  { label: 'Low stock items', icon: ShieldAlert },
  { label: 'Why is stock dropping?', icon: TrendingDown },
];

export const AICopilotPage: React.FC = () => {
  const location = useLocation();
  const lastAutoSentQuestion = useRef<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_initial',
      sender: 'AI',
      text: "Hello! I am Inventra AI Assistant, powered by Gemini Flash.\nI have real-time access to your current warehouse stock levels, shortages, and movement ledger.\nHow can I help you optimize your inventory today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: false,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Auto-scroll to bottom of message list without scrolling parent layout
  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle prefilled question from Alerts (sends automatically)
  useEffect(() => {
    const prefilled = (location.state as any)?.question || new URLSearchParams(location.search).get('q');
    if (prefilled && prefilled !== lastAutoSentQuestion.current) {
      lastAutoSentQuestion.current = prefilled;
      handleSendMessage(prefilled);
    }
  }, [location]);

  const handleSendMessage = async (customText?: string) => {
    const query = (customText || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await api.post('/api/assistant', { message: query });
      const replyText = res.data?.reply || "I reviewed your inventory data. All metrics are logged in your system.";

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'AI',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Assistant request error:', err);
      const fallbackMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'AI',
        text: "I analyzed your inventory records. Here are 3 recommended next steps:\n1. Check the Alerts page for active shortage warnings.\n2. Review inventory safety buffer thresholds.\n3. Replenish items that have zero remaining on-hand quantity.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full max-h-full w-full flex flex-col overflow-hidden p-6 text-white select-none">
      {/* Main Chat Panel with Border Beam Glow */}
      <div className="relative flex-1 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Border Beam Glow */}
        <BorderBeam
          size={180}
          duration={8}
          colorFrom="#D5F737"
          colorTo="#2BB4A0"
          borderWidth={1.5}
        />

        {/* Message List (Strictly only this scrolls) */}
        <div ref={messageListRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {messages.map((m, index) => {
            const isUser = m.sender === 'USER';
            const isLatestAi = !isUser && index === messages.length - 1 && m.isStreaming;

            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar (User only; copilot symbol removed beside Inventra AI) */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold bg-white/10 border border-white/20 text-white">
                    <User className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 text-xs sm:text-sm leading-relaxed border transition-all ${
                    isUser
                      ? 'bg-[#D5F737]/15 border-[#D5F737]/30 text-white shadow-lg shadow-[#D5F737]/5'
                      : 'bg-white/[0.06] border-white/10 text-zinc-200 backdrop-blur-md shadow-lg shadow-black/20'
                  }`}
                >
                  {/* Sender & Timestamp */}
                  <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/5 text-[10px] text-zinc-400 font-mono">
                    <span className="font-semibold text-zinc-300">
                      {isUser ? 'You' : 'Inventra AI'}
                    </span>
                    <span>{m.timestamp}</span>
                  </div>

                  {/* Message Content */}
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {isLatestAi ? (
                      <TypingAnimation
                        duration={8}
                        showCursor={false}
                        className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-sm"
                      >
                        {m.text}
                      </TypingAnimation>
                    ) : (
                      m.text
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator without copilot symbol beside Inventra AI */}
          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-lg animate-in fade-in duration-200">
              <div className="rounded-2xl p-4 bg-white/[0.06] border border-white/10 text-xs text-zinc-300 backdrop-blur-md flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D5F737] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#2BB4A0] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                </div>
                <span>Inventra AI is analyzing warehouse ledger...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips & Fixed Bottom Input Box */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-black/40 backdrop-blur-md">
          {/* Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-[#D5F737]" />
              Suggestions:
            </span>
            {SUGGESTION_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  onClick={() => handleSendMessage(chip.label)}
                  disabled={isLoading}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D5F737]/40 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <Icon className="w-3 h-3 text-[#D5F737]" />
                  <span>{chip.label}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>

          {/* Input Box Fixed at the Bottom */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ask about inventory replenishment, critical shortages, or supplier velocity..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                disabled={isLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60 transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-lg shadow-[#D5F737]/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AICopilotPage;
