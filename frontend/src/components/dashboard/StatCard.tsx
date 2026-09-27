import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  change?: string;
  isPositive?: boolean;
  symbol?: string;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  change,
  isPositive = true,
  symbol = '◉',
  accentColor = '#38bdf8',
}) => {
  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '14px',
        border: '1px solid #1e293b',
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '3px',
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
        }}
      />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '1.1rem',
            color: accentColor,
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: `${accentColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {symbol}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {change && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              color: isPositive ? '#10b981' : '#ef4444',
              backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#64748b' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};

export default StatCard;
