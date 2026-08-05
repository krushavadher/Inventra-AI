import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { ProductsPage } from './ProductsPage';
import { InventoryPage } from './InventoryPage';
import { WarehousePage } from './WarehousePage';
import { SuppliersPage } from './SuppliersPage';
import { PurchaseOrdersPage } from './PurchaseOrdersPage';
import { AIProcurementAssistantPage } from './AIProcurementAssistantPage';
import { AICopilotPage } from './AICopilotPage';
import { ReportsPage } from './ReportsPage';
import { NotificationDrawer } from './NotificationDrawer';
import { getAuthToken, getStoredUser, removeAuthToken } from './apiClient';

export type NavigationTab =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'warehouse'
  | 'suppliers'
  | 'purchase-orders'
  | 'ai-procurement'
  | 'ai-copilot'
  | 'reports';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const user = getStoredUser();
    if (token && user) {
      setCurrentUser(user);
    }
    setIsInitializing(false);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
  };

  if (isInitializing) {
    return <div style={{ backgroundColor: '#09090B', color: '#FFF', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Initializing StockMind AI...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const navItems: { id: NavigationTab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'products', label: 'Products Master', icon: '📦' },
    { id: 'inventory', label: 'Inventory Control', icon: '📉' },
    { id: 'warehouse', label: 'Warehouse WMS', icon: '🏬' },
    { id: 'suppliers', label: 'Suppliers & OTIF', icon: '🤝' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: '📝' },
    { id: 'ai-procurement', label: 'AI Procurement Mgr', icon: '🤖' },
    { id: 'ai-copilot', label: 'AI Copilot Chat', icon: '✨' },
    { id: 'reports', label: 'Reports & BI', icon: '📈' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#09090B', color: '#F4F4F5', fontFamily: 'Inter, sans-serif' }}>
      {/* Linear Style Sidebar */}
      <aside style={{ width: '250px', backgroundColor: '#121215', borderRight: '1px solid #27272A', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, zIndex: 10 }}>
        {/* Brand Logo */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: '#FFF' }}>S</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.02em', color: '#FFF' }}>StockMind AI</div>
            <div style={{ fontSize: '10px', color: '#8B5CF6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise SaaS</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#18181B' : 'transparent',
                  color: isActive ? '#FFF' : '#A1A1AA',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile with Working Logout Button */}
        <div style={{ padding: '16px', borderTop: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#09090B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              {currentUser.firstName ? currentUser.firstName[0] : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>{currentUser.firstName} {currentUser.lastName}</div>
              <div style={{ fontSize: '11px', color: '#71717A' }}>{currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ backgroundColor: '#27272A', color: '#F43F5E', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace Header & Content */}
      <div style={{ marginLeft: '250px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header Bar */}
        <header style={{ height: '64px', backgroundColor: '#121215', borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 9 }}>
          <div style={{ fontSize: '13px', color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>StockMind AI</span>
            <span>/</span>
            <span style={{ color: '#FFF', fontWeight: 600, textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationDrawer />
            <div style={{ height: '24px', width: '1px', backgroundColor: '#27272A' }}></div>
            <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
              ● API Online
            </span>
          </div>
        </header>

        {/* Tab Views */}
        <main style={{ flex: 1 }}>
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'warehouse' && <WarehousePage />}
          {activeTab === 'suppliers' && <SuppliersPage />}
          {activeTab === 'purchase-orders' && <PurchaseOrdersPage />}
          {activeTab === 'ai-procurement' && <AIProcurementAssistantPage />}
          {activeTab === 'ai-copilot' && <AICopilotPage />}
          {activeTab === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
