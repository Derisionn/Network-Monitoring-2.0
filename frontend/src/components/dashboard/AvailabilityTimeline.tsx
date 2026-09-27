import React, { useState } from 'react';

export interface TimelineBucket {
  hour: number;
  time_label: string;
  timestamp?: string;
  status: 'UP' | 'DOWN' | 'WARNING' | 'NOT_MONITORED';
  up_count?: number;
  down_count?: number;
}

interface AvailabilityTimelineProps {
  data?: TimelineBucket[];
}

export const AvailabilityTimeline: React.FC<AvailabilityTimelineProps> = ({ data = [] }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // We need exactly 24 buckets. Fill missing with NOT_MONITORED
  const safeData = data.length === 24 ? data : Array.from({ length: 24 }).map((_, i) => ({
    hour: i,
    time_label: `${i}:00`,
    status: 'NOT_MONITORED' as const,
    up_count: 0,
    down_count: 0
  }));

  const getColorForStatus = (status: TimelineBucket['status'], isHovered: boolean, isDimmed: boolean) => {
    // Premium Statuspage.io Color Palette
    const colors = {
      UP: { base: '#10b981', hover: '#34d399', dimmed: 'rgba(16, 185, 129, 0.4)' },
      WARNING: { base: '#f59e0b', hover: '#fbbf24', dimmed: 'rgba(245, 158, 11, 0.4)' },
      DOWN: { base: '#ef4444', hover: '#f87171', dimmed: 'rgba(239, 68, 68, 0.4)' },
      NOT_MONITORED: { base: '#ffffff', hover: '#f8fafc', dimmed: 'rgba(255, 255, 255, 0.4)' }
    };

    const palette = colors[status] || colors.NOT_MONITORED;
    if (isHovered) return palette.hover;
    if (isDimmed) return palette.dimmed;
    return palette.base;
  };

  const formatLocalTime = (bucket: TimelineBucket) => {
    if (bucket.timestamp) {
      const d = new Date(bucket.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return bucket.time_label;
  };

  return (
    <div style={{
      backgroundColor: '#0f172a',
      borderRadius: '16px',
      padding: '24px 32px',
      border: '1px solid #1e293b',
      marginTop: '24px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>
          Availability Timeline
        </h3>
        <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>
          Last 24 Hours (Local Time)
        </span>
      </div>

      {/* The Timeline Tracker (Statuspage Style) */}
      <div style={{ position: 'relative' }}>
        
        {/* Hour Labels */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '8px',
          color: '#64748b',
          fontSize: '0.75rem',
          fontWeight: 600,
          padding: '0 2px'
        }}>
          {safeData.map((bucket, index) => {
            let labelStr = bucket.time_label.split(':')[0];
            if (bucket.timestamp) {
              const d = new Date(bucket.timestamp);
              labelStr = d.toLocaleTimeString([], { hour: '2-digit', hour12: false });
            }
            return (
              <div key={`label-${index}`} style={{ width: `${100/24}%`, textAlign: 'center' }}>
                {labelStr}
              </div>
            );
          })}
        </div>

        {/* The Blocks */}
        <div 
          style={{ 
            display: 'flex', 
            height: '42px',
            gap: '4px',
            alignItems: 'stretch',
            marginBottom: '12px'
          }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {safeData.map((bucket, index) => {
            const isHovered = hoveredIndex === index;
            const isDimmed = hoveredIndex !== null && hoveredIndex !== index;
            
            // Calculate uptime text for tooltip
            let uptimeStr = "No data";
            if (bucket.status !== 'NOT_MONITORED') {
              const total = (bucket.up_count || 0) + (bucket.down_count || 0);
              const percent = total > 0 ? ((bucket.up_count || 0) / total) * 100 : 0;
              uptimeStr = `${percent.toFixed(1)}% Uptime`;
            }

            return (
              <div 
                key={`block-${index}`}
                onMouseEnter={() => setHoveredIndex(index)}
                title={`${formatLocalTime(bucket)}\nStatus: ${bucket.status}\n${uptimeStr}`}
                style={{
                  flex: 1,
                  backgroundColor: getColorForStatus(bucket.status, isHovered, isDimmed),
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: isHovered && bucket.status === 'UP' ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
                  transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)'
                }}
              />
            );
          })}
        </div>



      </div>

      {/* Elegant Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        gap: '24px',
        marginTop: '28px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Operational</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Degraded</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Downtime</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ffffff' }} />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>Unmonitored</span>
        </div>
      </div>
    </div>
  );
};
