import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  value: number;
  time: Date;
}

interface ThroughputGraphProps {
  currentValue: number;
  initialHistory?: { time: string; value: number }[];
  color?: string;
  maxPoints?: number;
}

export const ThroughputGraph: React.FC<ThroughputGraphProps> = ({ 
  currentValue, 
  initialHistory,
  color = '#a855f7', 
  maxPoints = 20 
}) => {
  // Use the backend history directly (stateless component)
  const data = useMemo(() => {
    const dataPoints: DataPoint[] = [];
    const numPadding = maxPoints - (initialHistory ? initialHistory.length : 0);
    
    // Base padding off the oldest real data point to prevent time jumps
    let anchorTime = new Date();
    if (initialHistory && initialHistory.length > 0) {
      anchorTime = new Date(initialHistory[0].time);
    }
    
    // Pad with zeroes FIRST (oldest to newest)
    for (let i = numPadding; i > 0; i--) {
      dataPoints.push({
        value: 0,
        time: new Date(anchorTime.getTime() - i * 30000)
      });
    }
    
    // Then push real history
    if (initialHistory && initialHistory.length > 0) {
      initialHistory.forEach(h => {
        dataPoints.push({ value: h.value, time: new Date(h.time) });
      });
    }
    
    // Convert to a format Recharts understands perfectly
    return dataPoints.slice(-maxPoints).map(d => ({
      timeFormatted: d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: d.value
    }));
  }, [initialHistory, maxPoints]);

  return (
    <div style={{ width: '100%', height: 180, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`colorValue-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
          
          <XAxis 
            dataKey="timeFormatted" 
            stroke="#64748b" 
            fontSize={11} 
            tickMargin={10}
            minTickGap={30}
            tickLine={false}
            axisLine={false}
          />
          
          <YAxis 
            stroke="#64748b" 
            fontSize={11} 
            tickFormatter={(value) => `${value}`}
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
            itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            formatter={(value: any) => {
              const num = typeof value === 'number' ? value : parseFloat(value || '0');
              return [`${num.toFixed(2)} Mbps`, 'Throughput'];
            }}
          />
          
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#colorValue-${color})`} 
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
