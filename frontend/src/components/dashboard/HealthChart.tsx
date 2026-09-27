import React, { useState } from 'react';
import { NetworkHealthPoint } from '../../types';

interface HealthChartProps {
  data: NetworkHealthPoint[];
}

export const HealthChart: React.FC<HealthChartProps> = ({ data }) => {
  const [metric, setMetric] = useState<'bandwidth' | 'latency'>('bandwidth');

  if (!data || data.length === 0) {
    return (
      <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '40px', color: '#64748b', textAlign: 'center' }}>
        No telemetry data available for the selected period.
      </div>
    );
  }

  // Chart dimensions
  const width = 600;
  const height = 200;
  const padding = 35;

  const maxVal = metric === 'bandwidth'
    ? Math.max(...data.map(d => Math.max(d.bandwidthInMbps, d.bandwidthOutMbps))) * 1.15
    : Math.max(...data.map(d => d.avgLatencyMs)) * 1.25;

  const pointsIn = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const val = metric === 'bandwidth' ? d.bandwidthInMbps : d.avgLatencyMs;
    const y = height - padding - (val / maxVal) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const pointsOut = metric === 'bandwidth'
    ? data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - (d.bandwidthOutMbps / maxVal) * (height - padding * 2);
        return `${x},${y}`;
      }).join(' ')
    : '';

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '16px',
        border: '1px solid #1e293b',
        padding: '22px 24px',
        color: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            Network Telemetry & Traffic Flow
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Real-time interface activity across core routing fabric
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMetric('bandwidth')}
            style={{
              background: metric === 'bandwidth' ? '#2563eb' : '#1e293b',
              color: metric === 'bandwidth' ? '#fff' : '#94a3b8',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Bandwidth (Mbps)
          </button>
          <button
            onClick={() => setMetric('latency')}
            style={{
              background: metric === 'latency' ? '#2563eb' : '#1e293b',
              color: metric === 'latency' ? '#fff' : '#94a3b8',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Latency (ms)
          </button>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minWidth: '450px' }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - padding - ratio * (height - padding * 2);
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#1e293b" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="#64748b" fontSize="9" textAnchor="end">
                  {Math.round(ratio * maxVal)}
                </text>
              </g>
            );
          })}

          {/* Time labels */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            return (
              <text key={i} x={x} y={height - 10} fill="#64748b" fontSize="10" textAnchor="middle">
                {d.time}
              </text>
            );
          })}

          {/* Lines */}
          {metric === 'bandwidth' && (
            <polyline
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsIn}
            />
          )}

          {metric === 'bandwidth' && (
            <polyline
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsOut}
            />
          )}

          {metric === 'latency' && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsIn}
            />
          )}

          {/* Dots */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - padding * 2);
            const val = metric === 'bandwidth' ? d.bandwidthInMbps : d.avgLatencyMs;
            const y = height - padding - (val / maxVal) * (height - padding * 2);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill={metric === 'bandwidth' ? '#38bdf8' : '#f59e0b'}
                stroke="#0f172a"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginTop: '14px' }}>
        {metric === 'bandwidth' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
              Inbound Traffic (Peak: 920 Mbps)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#a855f7' }} />
              Outbound Traffic (Peak: 520 Mbps)
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            Round-Trip Time Latency (Avg: 5.6 ms)
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthChart;
