import React, { useState, useEffect } from 'react';

export interface NotificationItem {
  _id: string;
  type: 'LOW_STOCK' | 'PURCHASE_APPROVAL' | 'ORDER_DELIVERED' | 'PRODUCT_EXPIRING' | 'AI_RECOMMENDATION';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const NotificationDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Mock Notification Fetch (Connects to GET /api/v1/notifications/unread)
    const initialList: NotificationItem[] = [
      {
        _id: 'notif_1',
        type: 'LOW_STOCK',
        title: 'Critical Stockout Alert: SKU-8842-MCU',
        message: 'Product SKU-8842-MCU is at 5 units available, breaching safety threshold of 20 units.',
        severity: 'CRITICAL',
        isRead: false,
        actionUrl: '/inventory?sku=SKU-8842-MCU',
        createdAt: '2026-08-03T17:45:00Z'
      },
      {
        _id: 'notif_2',
        type: 'PURCHASE_APPROVAL',
        title: 'PO Approval Required: PO-88402',
        message: 'Purchase Order PO-88402 for $6,000.00 requires executive sign-off.',
        severity: 'WARNING',
        isRead: false,
        actionUrl: '/procurement/purchase-orders?po=PO-88402',
        createdAt: '2026-08-03T17:30:00Z'
      },
      {
        _id: 'notif_3',
        type: 'ORDER_DELIVERED',
        title: 'Inbound Shipment Received: GRN-99104',
        message: 'Goods receipt note GRN-99104 for PO-88401 received at dock.',
        severity: 'INFO',
        isRead: false,
        actionUrl: '/procurement/grn/GRN-99104',
        createdAt: '2026-08-03T16:00:00Z'
      },
      {
        _id: 'notif_4',
        type: 'AI_RECOMMENDATION',
        title: 'AI Procurement Advice: REC-99104',
        message: 'Senior AI Procurement Manager generated a purchasing recommendation & draft PO for SKU-8842-MCU.',
        severity: 'INFO',
        isRead: false,
        actionUrl: '/ai-procurement',
        createdAt: '2026-08-03T15:30:00Z'
      }
    ];

    setNotifications(initialList);
    setUnreadCount(initialList.filter(n => !n.isRead).length);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleMarkSingleRead = (id: string) => {
    setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
        style={{ padding: '7px 12px', fontSize: '12px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span className="badge badge-danger" style={{ padding: '1px 6px', fontSize: '10px' }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Over Notification Drawer */}
      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'fixed',
            top: '72px',
            right: '28px',
            width: '380px',
            backgroundColor: '#111115',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            boxShadow: '0 16px 36px rgba(0,0,0,0.65)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#FAFAFA' }}>Alert Center ({unreadCount} Unread)</h3>
            <button onClick={handleMarkAllRead} style={{ backgroundColor: 'transparent', border: 'none', color: '#818CF8', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              Mark All Read
            </button>
          </div>

          {/* List Stream */}
          <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '12px' }}>
            {notifications.map((item) => (
              <div
                key={item._id}
                onClick={() => handleMarkSingleRead(item._id)}
                style={{
                  backgroundColor: item.isRead ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.035)',
                  borderLeft: `4px solid ${item.severity === 'CRITICAL' ? '#EF4444' : item.severity === 'WARNING' ? '#F59E0B' : '#6366F1'}`,
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  opacity: item.isRead ? 0.65 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#FAFAFA' }}>{item.title}</div>
                  <div style={{ fontSize: '10px', color: '#71717A' }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.4 }}>{item.message}</div>
                {item.actionUrl && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#818CF8', fontWeight: 600 }}>
                    Open Action &rarr;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDrawer;
