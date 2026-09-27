import React from 'react';
import { DeviceStatus } from '../../types/device';

interface StatusBadgeProps {
  status: DeviceStatus;
  showPulse?: boolean;
}

const statusConfig: Record<
  DeviceStatus,
  { label: string; bg: string; text: string; dot: string; pulse: string }
> = {
  online: {
    label: 'Online',
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#10b981',
    dot: '#10b981',
    pulse: 'rgba(16, 185, 129, 0.4)',
  },
  warning: {
    label: 'Warning',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#f59e0b',
    dot: '#f59e0b',
    pulse: 'rgba(245, 158, 11, 0.4)',
  },
  degraded: {
    label: 'Degraded',
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#f87171',
    dot: '#f87171',
    pulse: 'rgba(239, 68, 68, 0.4)',
  },
  offline: {
    label: 'Offline',
    bg: 'rgba(100, 116, 139, 0.15)',
    text: '#94a3b8',
    dot: '#64748b',
    pulse: 'transparent',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showPulse = true }) => {
  const config = statusConfig[status] || statusConfig.offline;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.dot}33`,
        letterSpacing: '0.02em',
        textTransform: 'capitalize',
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-flex',
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: config.dot,
        }}
      >
        {showPulse && status === 'online' && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              width: '11px',
              height: '11px',
              borderRadius: '50%',
              backgroundColor: config.pulse,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
        )}
      </span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
