import React from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenAddDevice?: () => void;
  isBackendOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Network Dashboard',
  subtitle = 'Real-time telemetry and infrastructure health',
  onRefresh,
  isRefreshing = false,
  onOpenAddDevice,
  isBackendOnline = true,
}) => {
  return (
    <header
      style={{
        height: '70px',
        padding: '0 32px',
        borderBottom: '1px solid #1e293b',
        backgroundColor: 'rgba(11, 17, 32, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Real-time Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: isBackendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: isBackendOnline ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isBackendOnline ? '#10b981' : '#ef4444',
              boxShadow: isBackendOnline ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }}
          />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isBackendOnline ? '#34d399' : '#f87171' }}>
            {isBackendOnline ? 'Telemetry Online' : 'Backend Offline'}
          </span>
        </div>

        {/* Header Add Device Button */}
        {onOpenAddDevice && (
          <button
            onClick={onOpenAddDevice}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>+</span>
            <span>Add Device</span>
          </button>
        )}

        {/* Sync/Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>↻</span>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
