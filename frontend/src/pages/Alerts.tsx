import React, { useState } from 'react';
import { NetworkAlert } from '../types';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  const getSeverityBadge = (severity: NetworkAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '#ef444455',
          label: 'CRITICAL',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '#f59e0b55',
          label: 'WARNING',
        };
      case 'info':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: '#38bdf8',
          border: '#38bdf855',
          label: 'INFO',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#f8fafc' }}>
      {/* Top Header & Filter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            Active Incidents & Alerts Stream
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Real-time threshold breaches, link flaps, and system outages
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'critical', 'warning', 'info'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              style={{
                background: filter === lvl ? '#2563eb' : '#1e293b',
                color: filter === lvl ? '#fff' : '#94a3b8',
                border: '1px solid #334155',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAlerts.length === 0 ? (
          <div
            style={{
              background: '#0f172a',
              borderRadius: '14px',
              border: '1px solid #1e293b',
              padding: '40px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            No active incidents matching the selected filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);

            return (
              <div
                key={alert.id}
                style={{
                  background: alert.acknowledged ? '#0f172a' : '#141e33',
                  borderRadius: '12px',
                  border: `1px solid ${alert.acknowledged ? '#1e293b' : badge.border}`,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  opacity: alert.acknowledged ? 0.75 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      marginTop: '2px',
                    }}
                  >
                    {badge.label}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>
                        {alert.deviceName}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                        ({alert.deviceIp})
                      </span>
                      {alert.acknowledged && (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: '#334155', padding: '1px 6px', borderRadius: '4px' }}>
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#cbd5e1' }}>
                      {alert.message}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'inline-block', marginTop: '6px' }}>
                      Detected: {alert.timestamp}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;
