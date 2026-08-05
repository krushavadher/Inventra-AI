import React, { useState } from 'react';

export interface ReportCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoint: string;
}

export const ReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('inventory');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('CSV');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const reportCatalog: ReportCatalogItem[] = [
    { id: 'inventory', name: 'Inventory Valuation & Stock Balance', category: 'Inventory', description: 'Real-time SKU balances, unit costs, selling prices, tax rates, and ABC classes.', endpoint: '/api/v1/reports/inventory' },
    { id: 'suppliers', name: 'Supplier Performance & OTIF Ratings', category: 'Procurement', description: 'Vendor scorecards, lead-time variances, OTIF ratings, and YTD spend distribution.', endpoint: '/api/v1/reports/suppliers' },
    { id: 'sales', name: 'Sales Volume & Fulfillment Allocations', category: 'Sales', description: 'Omnichannel order volume, customer channels, and Available-To-Promise fulfillment status.', endpoint: '/api/v1/reports/sales' },
    { id: 'warehouses', name: 'Warehouse Occupancy & Capacity', category: 'Warehouse', description: 'Volume cubic meters capacity, weight load limits, and zone bin density.', endpoint: '/api/v1/reports/warehouses' },
    { id: 'forecasts', name: 'AI Demand Predictions & Safety Stock', category: 'AI Analytics', description: '30-day predicted demand trajectory vs safety stock threshold limits.', endpoint: '/api/v1/reports/forecasts' },
    { id: 'procurement', name: 'Purchase Orders & 3-Way Reconciliation', category: 'Procurement', description: 'PO history, vendor invoice 3-way match status, and approval cycle times.', endpoint: '/api/v1/reports/procurement' }
  ];

  const handleDownloadReport = () => {
    const active = reportCatalog.find(r => r.id === selectedReport);
    if (!active) return;

    if (exportFormat === 'CSV') {
      window.open(`http://localhost:5000${active.endpoint}?format=csv`, '_blank');
    } else {
      alert(`Generating ${exportFormat} export for ${active.name}... File download will initiate momentarily.`);
    }
  };

  return (
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Enterprise Reports & BI Export Center</h1>
          <p style={{ color: '#A1A1AA', fontSize: '14px', margin: '4px 0 0 0' }}>Generate, schedule, and export business intelligence reports in PDF, Excel, and CSV formats.</p>
        </div>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          style={{ backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          ⏰ Schedule Automated Export
        </button>
      </div>

      {/* Main Grid: Catalog List vs Export Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Report Catalog Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {reportCatalog.map((rep) => (
            <div
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              style={{
                backgroundColor: '#18181B',
                border: selectedReport === rep.id ? '2px solid #6366F1' : '1px solid #27272A',
                padding: '20px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.1s ease'
              }}
            >
              <div style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: 600, marginBottom: '6px' }}>{rep.category}</div>
              <h3 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#FFF' }}>{rep.name}</h3>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0, lineHeight: 1.5 }}>{rep.description}</p>
            </div>
          ))}
        </div>

        {/* Export Controls & Format Selector */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '14px', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Export Configuration</h3>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '8px' }}>Select Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setExportFormat('PDF')}
                style={{
                  backgroundColor: exportFormat === 'PDF' ? '#6366F1' : '#09090B',
                  border: '1px solid #27272A',
                  color: '#FFF',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📄 PDF
              </button>
              <button
                onClick={() => setExportFormat('EXCEL')}
                style={{
                  backgroundColor: exportFormat === 'EXCEL' ? '#6366F1' : '#09090B',
                  border: '1px solid #27272A',
                  color: '#FFF',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📊 Excel
              </button>
              <button
                onClick={() => setExportFormat('CSV')}
                style={{
                  backgroundColor: exportFormat === 'CSV' ? '#6366F1' : '#09090B',
                  border: '1px solid #27272A',
                  color: '#FFF',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📝 CSV
              </button>
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            style={{
              width: '100%',
              backgroundColor: '#10B981',
              color: '#FFF',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Download {exportFormat} Report
          </button>
        </div>
      </div>

      {/* Schedule Export Modal */}
      {isScheduleModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '16px', width: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Schedule Automated Email Report</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Recipient Email Addresses</label>
              <input defaultValue="cpo@enterprise.com, finance@enterprise.com" style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Frequency</label>
              <select style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                <option>Every Monday at 8:00 AM</option>
                <option>Daily at 6:00 PM</option>
                <option>1st Day of Month</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
