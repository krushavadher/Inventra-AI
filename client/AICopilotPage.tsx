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
      text: 'Hello! I am Inventra AI Copilot. How can I assist with your supply chain, demand forecasting, or procurement today?',
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
        aiText = "**Inventra AI Executive Synthesis Report**: Total Working Capital Inventory Value stands at **$285,000**. Procurement cycle time accelerated by 42% following automated PO approval rules.";
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
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr 320px', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Left Preset Prompt Sidebar */}
      <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', padding: '24px', backgroundColor: '#0F0F12' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#FAFAFA' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#FFF' }}>✨</div>
          Copilot Sessions
        </div>
        <div className="kpi-label" style={{ marginBottom: '12px' }}>Suggested Prompts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => handleSendMessage('Which items are at risk of stockout next week?')} className="btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '10px 12px' }}>⚠️ Check Stockout Risks</button>
          <button onClick={() => handleSendMessage('Summarize top supplier OTIF performance')} className="btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '10px 12px' }}>🤝 Vendor OTIF Scorecard</button>
          <button onClick={() => handleSendMessage('Synthesize Executive Supply Chain Report')} className="btn-secondary" style={{ textAlign: 'left', justifyContent: 'flex-start', padding: '10px 12px' }}>📈 Executive Synthesis Report</button>
        </div>
      </div>

      {/* Center Chat Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, fontSize: '15px', color: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>AI Procurement & Inventory Intelligence Workspace</span>
          <span className="badge badge-info">● REAL-TIME ONLINE</span>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: '12px', alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {m.sender === 'AI' && <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', color: '#FFF' }}>AI</div>}
              <div className={m.sender === 'USER' ? 'glass-card-hero' : 'glass-card'} style={{ padding: '14px 18px', borderRadius: '12px', fontSize: '13.5px', lineHeight: 1.6, backgroundColor: m.sender === 'USER' ? 'rgba(99,102,241,0.15)' : undefined, borderColor: m.sender === 'USER' ? 'rgba(99,102,241,0.35)' : undefined }}>
                <div>{m.text}</div>
                {m.suggestedActions && m.suggestedActions.map((act, i) => (
                  <div key={i} style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>{act.label} &rarr;</button>
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
              placeholder="Ask Inventra AI (e.g. 'Draft PO for low stock items', 'Explain SKU-8842 demand forecast')..."
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
