import React, { useState, useEffect } from 'react';
import { LoginPage } from './LoginPage';
import { DashboardPage } from './DashboardPage';
import { ProductsPage } from './ProductsPage';
import { InventoryPage } from './InventoryPage';
import { WarehousePage } from './WarehousePage';
import { SuppliersPage } from './SuppliersPage';
import { PurchaseOrdersPage } from './PurchaseOrdersPage';
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
    return <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Initializing Inventra AI...</div>;
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const navItems: { id: NavigationTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products Master' },
    { id: 'inventory', label: 'Inventory Control' },
    { id: 'warehouse', label: 'Warehouse WMS' },
    { id: 'suppliers', label: 'Suppliers & OTIF' },
    { id: 'purchase-orders', label: 'Purchase Orders' },
    { id: 'reports', label: 'Reports & BI' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
      {/* Linear Style Sidebar */}
      <aside style={{ width: '250px', backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, zIndex: 10 }}>
        {/* Brand Logo */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px', color: '#111' }}>I</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Inventra AI</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enterprise SaaS</div>
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
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile with Working Logout Button */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              {currentUser.firstName ? currentUser.firstName[0] : 'U'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{currentUser.firstName} {currentUser.lastName}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{currentUser.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Workspace Header & Content */}
      <div style={{ marginLeft: '250px', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-base)' }}>
        {/* Header Bar */}
        <header style={{ height: '64px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 9 }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Inventra AI</span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationDrawer />
            <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }}></div>
            <span className="badge badge-success">
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
          {activeTab === 'reports' && <ReportsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;
