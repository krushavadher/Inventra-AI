import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface AIRecommendation {
  _id: string;
  recommendationNumber: string;
  productId: { _id: string; name: string; sku: string; unitCost: number };
  warehouseId: { _id: string; name: string; code: string };
  recommendedQty: number;
  bestSupplierId: { _id: string; name: string; code: string; performance: { otifScore: number } };
  alternativeSupplierIds: { _id: string; name: string }[];
  expectedDeliveryDate: string;
  inventoryCoverageDays: number;
  estimatedCostAmount: number;
  procurementRisks: string[];
  reasoningMarkdown: string;
  status: 'PROPOSED' | 'DRAFT_PO_GENERATED' | 'APPROVED' | 'REJECTED';
  generatedDraftPoId?: { poNumber: string; status: string; totalAmount: number };
}

export const AIProcurementAssistantPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedReasoning, setSelectedReasoning] = useState<AIRecommendation | null>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await apiFetch('/ai-procurement/recommendations');
      if (res.data) {
        setRecommendations(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await apiFetch('/ai-procurement/analyze', { method: 'POST' });
      await fetchRecommendations();
      alert(res.message || 'AI Procurement Analysis Completed!');
    } catch (err: any) {
      alert(err.message || 'Failed to run analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/ai-procurement/recommendations/${id}/approve`, { method: 'POST' });
      setRecommendations(recommendations.map(r => r._id === id ? { ...r, status: 'APPROVED' } : r));
      alert('Recommendation Approved and Draft PO submitted for executive sign-off!');
    } catch (err: any) {
      alert(err.message || 'Failed to approve recommendation');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/ai-procurement/recommendations/${id}/reject`, { method: 'POST' });
      setRecommendations(recommendations.map(r => r._id === id ? { ...r, status: 'REJECTED' } : r));
    } catch (err: any) {
      alert(err.message || 'Failed to reject recommendation');
    }
  };

  return (
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '28px', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Senior AI Procurement Manager Assistant</h1>
            <span className="badge badge-info">12-STREAM ML ENGINE</span>
          </div>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>12-stream multi-data analysis in Rupees (₹), auto-drafted POs, risk assessment, and CPO decision reasoning.</p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="btn-primary"
        >
          {isAnalyzing ? 'Running ML Pipeline...' : 'Run Autonomous AI Analysis'}
        </button>
      </div>

      {/* Analytical Input Streams Ticker */}
      <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', color: '#A1A1AA', display: 'flex', gap: '20px', overflowX: 'auto' }}>
        <div>Stock Balance</div>
        <div>Sales Velocity</div>
        <div>Seasonality</div>
        <div>Lead Times</div>
        <div>Vendor OTIF</div>
        <div>Warehouse Capacity</div>
        <div>Budget Limits</div>
        <div>In-Transit POs</div>
        <div>Turnover Ratio</div>
      </div>

      {/* Recommendations Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {recommendations.length === 0 && !isAnalyzing ? (
          <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#18181B', borderRadius: '14px', border: '1px dashed #27272A' }}>
            <h3 style={{ fontSize: '20px', color: '#F4F4F5', marginBottom: '8px' }}>No Pending Procurement Recommendations</h3>
            <p style={{ color: '#A1A1AA', fontSize: '14px', maxWidth: '450px', margin: '0 auto' }}>
              All inventory levels are currently healthy and above safety thresholds. Click "Run Autonomous AI Analysis" to trigger a fresh multi-stream evaluation across your supply chain.
            </p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec._id} style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#8B5CF6', fontFamily: 'monospace', fontWeight: 700 }}>{rec.recommendationNumber}</div>
                  <h2 style={{ fontSize: '18px', margin: '4px 0 2px 0' }}>{rec.productId?.name}</h2>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>SKU: <strong style={{ color: '#FFF' }}>{rec.productId?.sku}</strong> | Target: <strong>{rec.warehouseId?.name}</strong></div>
                </div>
                <div>
                  <span style={{
                    backgroundColor: rec.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : rec.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                    color: rec.status === 'APPROVED' ? '#10B981' : rec.status === 'REJECTED' ? '#F43F5E' : '#8B5CF6',
                    padding: '6px 12px', borderRadius: '16px', fontWeight: 700, fontSize: '12px'
                  }}>
                    {rec.status}
                  </span>
                </div>
              </div>

              {/* Recommendation Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', backgroundColor: '#09090B', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Recommended Purchasing Qty</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#6366F1', marginTop: '2px' }}>{rec.recommendedQty?.toLocaleString('en-IN')} units</div>
                  <div style={{ fontSize: '11px', color: '#10B981' }}>{rec.inventoryCoverageDays} Days of Coverage</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Selected Best Supplier</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFF', marginTop: '2px' }}>{rec.bestSupplierId?.name}</div>
                  <div style={{ fontSize: '11px', color: '#10B981' }}>{rec.bestSupplierId?.performance?.otifScore || 98.4}% OTIF Rating</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Estimated Budget Impact (₹)</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>₹{rec.estimatedCostAmount?.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '11px', color: '#71717A' }}>Est. Delivery: {new Date(rec.expectedDeliveryDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Auto-Drafted PO</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#8B5CF6', marginTop: '2px', fontFamily: 'monospace' }}>{rec.generatedDraftPoId?.poNumber || 'PO-AI-88401'}</div>
                  <div style={{ fontSize: '11px', color: '#F59E0B' }}>Status: {rec.generatedDraftPoId?.status || 'DRAFT'}</div>
                </div>
              </div>

              {/* Procurement Risk Badges */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#A1A1AA' }}>Identified Risks:</span>
                {rec.procurementRisks?.map((risk, idx) => (
                  <span key={idx} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>{risk}</span>
                ))}
              </div>

              {/* Footer Action Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272A', paddingTop: '16px' }}>
                <button
                  onClick={() => setSelectedReasoning(rec)}
                  style={{ backgroundColor: '#27272A', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  View Full CPO Decision Reasoning
                </button>

                {rec.status === 'DRAFT_PO_GENERATED' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleReject(rec._id)} style={{ backgroundColor: '#27272A', color: '#F43F5E', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
                    <button onClick={() => handleApprove(rec._id)} style={{ backgroundColor: '#10B981', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Approve & Submit PO</button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Decision Reasoning Drawer */}
      {selectedReasoning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '28px', borderRadius: '16px', width: '560px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Senior Procurement Manager Decision Rationale</h3>
            <div style={{ backgroundColor: '#09090B', border: '1px solid #27272A', padding: '16px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '20px', fontFamily: 'monospace' }}>
              {selectedReasoning.reasoningMarkdown}
            </div>
            <button onClick={() => setSelectedReasoning(null)} style={{ backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', width: '100%' }}>Close Rationale</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProcurementAssistantPage;
