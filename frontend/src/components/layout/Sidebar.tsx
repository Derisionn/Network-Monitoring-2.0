import React from 'react';

export type NavItemKey = 'dashboard' | 'devices' | 'alerts' | 'probes';

export interface SidebarProps {
  currentTab?: NavItemKey;
  onSelectTab?: (tab: NavItemKey) => void;
  alertCount?: number;
}

interface NavItemConfig {
  key: NavItemKey;
  label: string;
  symbol: string;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab = 'dashboard',
  onSelectTab,
  alertCount = 3,
}) => {
  const primaryNavItems: NavItemConfig[] = [
    { key: 'dashboard', label: 'Dashboard', symbol: '▣' },
    { key: 'devices', label: 'Devices', symbol: '◉' },
    { key: 'probes', label: 'Probes & Agents', symbol: '📡' },
    { key: 'alerts', label: 'Alerts', symbol: '⚠', badge: alertCount },
  ];

  const bottomNavItems: NavItemConfig[] = [];

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: '#0b1120',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      {/* ◈ NetMonitor Brand Header */}
      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <span
          style={{
            fontSize: '1.4rem',
            color: '#38bdf8',
            lineHeight: 1,
            textShadow: '0 0 12px rgba(56, 189, 248, 0.5)',
          }}
        >
          ◈
        </span>
        <div>
          <div
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#f8fafc',
            }}
          >
            NetMonitor
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginTop: '2px',
            }}
          >
            Network Operations Center
          </div>
        </div>
      </div>

      {/* Main Navigation List */}
      <nav
        style={{
          flex: 1,
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#475569',
            padding: '4px 12px 8px',
          }}
        >
          Main Navigation
        </div>

        {primaryNavItems.map((item) => {
          const isActive = currentTab === item.key;
          const isAlert = item.key === 'alerts';

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab?.(item.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                fontSize: '0.92rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                outline: 'none',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.6)';
                  e.currentTarget.style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    fontSize: isAlert ? '1.05rem' : '1.1rem',
                    lineHeight: 1,
                    color: isActive
                      ? '#38bdf8'
                      : isAlert
                      ? '#f59e0b'
                      : '#64748b',
                    transition: 'color 0.15s',
                  }}
                >
                  {item.symbol}
                </span>
                <span>{item.label}</span>
              </div>

              {/* Optional live counter pill (e.g. for Alerts) */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Pinned Navigation (Settings) removed */}
    </aside>
  );
};

export default Sidebar;
