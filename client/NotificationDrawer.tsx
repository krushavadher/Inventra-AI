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
    <div>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          backgroundColor: '#18181B',
          border: '1px solid #27272A',
          color: '#FFF',
          padding: '10px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        <span>🔔 Alerts</span>
        {unreadCount > 0 && (
          <span style={{ backgroundColor: '#F43F5E', color: '#FFF', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-Over Notification Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '24px',
            width: '380px',
            backgroundColor: '#18181B',
            border: '1px solid #27272A',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 1000,
            overflow: 'hidden',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#FFF' }}>System Alert Center ({unreadCount} New)</h3>
            <button onClick={handleMarkAllRead} style={{ backgroundColor: 'transparent', border: 'none', color: '#6366F1', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
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
                  backgroundColor: item.isRead ? '#09090B' : '#121215',
                  borderLeft: `4px solid ${item.severity === 'CRITICAL' ? '#F43F5E' : item.severity === 'WARNING' ? '#F59E0B' : '#6366F1'}`,
                  border: '1px solid #27272A',
                  padding: '14px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  opacity: item.isRead ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#FFF' }}>{item.title}</div>
                  <div style={{ fontSize: '10px', color: '#71717A' }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.4 }}>{item.message}</div>
                {item.actionUrl && (
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#6366F1', fontWeight: 600 }}>
                    Open Action <span style={{ fontFamily: 'monospace' }}>&rarr;</span>
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
