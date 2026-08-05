import React, { useState } from 'react';

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  suggestedActions?: { actionType: string; label: string; payload: any }[];
  timestamp: string;
}

export const AICopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'AI',
      text: 'Hello! I am StockMind AI Copilot. How can I assist with your supply chain, demand forecasting, or procurement today?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'USER',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    // Mock API fetch to POST /api/v1/ai/copilot/chat
    setTimeout(() => {
      let aiText = "I analyzed your global inventory ledger. 1 item is at critical stockout risk: **SKU-8842-MCU (Microcontroller Unit)** with only 5 units remaining in *East Coast DC*.";
      let actions = [
        { actionType: "CREATE_DRAFT_PO", label: "Draft PO for 1,000 units of SKU-8842-MCU", payload: { sku: "SKU-8842-MCU", qty: 1000 } }
      ];

      if (query.toLowerCase().includes("report")) {
        aiText = "**StockMind AI Executive Synthesis Report**: Total Working Capital Inventory Value stands at **$285,000**. Procurement cycle time accelerated by 42% following automated PO approval rules.";
        actions = [];
      } else if (query.toLowerCase().includes("vendor") || query.toLowerCase().includes("supplier")) {
        aiText = "Vendor OTIF Performance Summary: Top performing supplier is *TechComponents Inc.* with **98.4% OTIF**. Average supplier lead time variance is 0 days.";
        actions = [];
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'AI',
        text: aiText,
        suggestedActions: actions,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr 320px', fontFamily: 'Inter, sans-serif' }}>
      {/* Left Preset Prompt Sidebar */}
      <div style={{ borderRight: '1px solid #27272A', padding: '20px', backgroundColor: '#121215' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#8B5CF6' }}>✨</span> Copilot Sessions
        </div>
        <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Prompts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => handleSendMessage('Which items are at risk of stockout next week?')} style={{ textAlign: 'left', backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>⚠️ Check Stockout Risks</button>
          <button onClick={() => handleSendMessage('Summarize top supplier OTIF performance')} style={{ textAlign: 'left', backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>🤝 Vendor OTIF Scorecard</button>
          <button onClick={() => handleSendMessage('Synthesize Executive Supply Chain Report')} style={{ textAlign: 'left', backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>📈 Executive Synthesis Report</button>
        </div>
      </div>

      {/* Center Chat Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #27272A', fontWeight: 600, fontSize: '16px' }}>
          AI Procurement & Inventory Intelligence Workspace
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: '12px', alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.sender === 'AI' && <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>AI</div>}
              <div style={{ backgroundColor: m.sender === 'USER' ? '#6366F1' : '#18181B', border: m.sender === 'USER' ? 'none' : '1px solid #27272A', padding: '14px 18px', borderRadius: '12px', fontSize: '14px', lineHeight: 1.6 }}>
                <div>{m.text}</div>
                {m.suggestedActions && m.suggestedActions.map((act, i) => (
                  <div key={i} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #27272A' }}>
                    <button style={{ backgroundColor: '#10B981', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{act.label} $\rightarrow$</button>
                  </div>
                ))}
                <div style={{ fontSize: '10px', color: '#71717A', marginTop: '6px', textAlign: 'right' }}>{m.timestamp}</div>
              </div>
            </div>
          ))}
          {isLoading && <div style={{ color: '#A1A1AA', fontSize: '13px' }}>AI Copilot is reasoning over stock ledger...</div>}
        </div>

        {/* Chat Input Bar */}
        <div style={{ padding: '20px', borderTop: '1px solid #27272A', backgroundColor: '#121215' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Ask StockMind AI (e.g. 'Draft PO for low stock items', 'Explain SKU-8842 demand forecast')..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              style={{ flex: 1, backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}
            />
            <button type="submit" style={{ backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </form>
        </div>
      </div>

      {/* Right Context Inspector */}
      <div style={{ borderLeft: '1px solid #27272A', padding: '20px', backgroundColor: '#121215' }}>
        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '16px', color: '#A1A1AA' }}>Active Context Entity</div>
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '16px', borderRadius: '10px' }}>
          <div style={{ fontSize: '12px', color: '#6366F1', fontFamily: 'monospace' }}>SKU-8842-MCU</div>
          <div style={{ fontWeight: 700, fontSize: '15px', margin: '4px 0 8px 0' }}>Microcontroller Unit Dual-Core</div>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>Available Stock: <strong style={{ color: '#F43F5E' }}>5 units</strong></div>
          <div style={{ fontSize: '13px', marginBottom: '4px' }}>Safety Stock: <strong>20 units</strong></div>
          <div style={{ fontSize: '13px' }}>Primary Vendor: <strong>TechComponents Inc.</strong></div>
        </div>
      </div>
    </div>
  );
};

export default AICopilotPage;
