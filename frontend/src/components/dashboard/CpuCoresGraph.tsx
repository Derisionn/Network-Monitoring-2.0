import React from 'react';

export interface CpuCore {
  name: string;
  usage: number;
}

interface CpuCoresGraphProps {
  cores: CpuCore[];
}

export const CpuCoresGraph: React.FC<CpuCoresGraphProps> = ({ cores }) => {
  if (!cores || cores.length === 0) {
    return <div style={{ color: '#64748b', fontSize: '0.85rem', padding: '16px 0' }}>No CPU core data available via SNMP.</div>;
  }

  const getColor = (usage: number) => {
    if (usage > 85) return '#ef4444'; // Red
    if (usage > 60) return '#f59e0b'; // Yellow
    return '#38bdf8'; // Blue
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
          Logical Processors ({cores.length})
        </h3>
        <span style={{ fontWeight: 600, color: '#38bdf8' }}>
          Avg: {Math.round(cores.reduce((a, b) => a + b.usage, 0) / cores.length)}%
        </span>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '100px' }}>
        {cores.map((core, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '20px' }}>
            <div style={{ 
              fontSize: '0.65rem', 
              color: '#94a3b8', 
              marginBottom: '4px' 
            }}>
              {core.usage}%
            </div>
            <div style={{
              width: '100%',
              maxWidth: '28px',
              height: '70px',
              background: '#1e293b',
              borderRadius: '4px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${Math.min(100, Math.max(0, core.usage))}%`,
                background: getColor(core.usage),
                transition: 'height 0.5s ease-in-out, background-color 0.5s ease-in-out'
              }} />
            </div>
            <div style={{ 
              fontSize: '0.65rem', 
              color: '#64748b', 
              marginTop: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              C{idx + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
