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
    <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', padding: '32px 40px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">Enterprise Reports & BI Export Center</h1>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>Generate, schedule, and export business intelligence reports in PDF, Excel, and CSV formats.</p>
        </div>
        <button
          onClick={() => setIsScheduleModalOpen(true)}
          className="btn-secondary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Schedule Automated Export
        </button>
      </div>

      {/* Main Grid: Catalog List vs Export Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Report Catalog Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {reportCatalog.map((rep) => {
            const isSelected = selectedReport === rep.id;
            return (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className="panel-bordered"
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-cool)' : undefined,
                  backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <span className="badge badge-info" style={{ marginBottom: '8px' }}>{rep.category}</span>
                <h3 className="section-title" style={{ margin: '6px 0 8px 0', fontSize: '15px' }}>{rep.name}</h3>
                <p className="subtext-muted" style={{ lineHeight: 1.5 }}>{rep.description}</p>
              </div>
            );
          })}
        </div>

        {/* Export Controls & Format Selector */}
        <div className="panel-bordered" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Export Configuration</h3>

          <div style={{ marginBottom: '20px' }}>
            <label className="kpi-label" style={{ display: 'block', marginBottom: '8px' }}>Select Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setExportFormat('PDF')}
                className={exportFormat === 'PDF' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '9px 6px', fontSize: '12px' }}
              >
                📄 PDF
              </button>
              <button
                onClick={() => setExportFormat('EXCEL')}
                className={exportFormat === 'EXCEL' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '9px 6px', fontSize: '12px' }}
              >
                📊 Excel
              </button>
              <button
                onClick={() => setExportFormat('CSV')}
                className={exportFormat === 'CSV' ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '9px 6px', fontSize: '12px' }}
              >
                📝 CSV
              </button>
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            className="btn-primary"
            style={{ width: '100%', padding: '12px' }}
          >
            Download {exportFormat} Report
          </button>
        </div>
      </div>

      {/* Schedule Export Modal */}
      {isScheduleModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 17, 23, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="panel-bordered" style={{ padding: '24px', width: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>Schedule Automated Email Report</h3>
            <div style={{ marginBottom: '12px' }}>
              <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Recipient Email Addresses</label>
              <input defaultValue="cpo@enterprise.com, finance@enterprise.com" className="input-dark" style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Frequency</label>
              <select className="input-dark" style={{ width: '100%' }}>
                <option>Every Monday at 8:00 AM</option>
                <option>Daily at 6:00 PM</option>
                <option>1st Day of Month</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsScheduleModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => setIsScheduleModalOpen(false)} className="btn-primary">Save Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
