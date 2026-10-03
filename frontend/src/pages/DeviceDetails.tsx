import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { NetworkDevice } from '../types/device';
import { StatusBadge } from '../components/common/StatusBadge';
import { AvailabilityTimeline } from '../components/dashboard/AvailabilityTimeline';
import { CpuCoresGraph } from '../components/dashboard/CpuCoresGraph';
import { ThroughputGraph } from '../components/dashboard/ThroughputGraph';
import EditProtocolsModal from '../components/dashboard/EditProtocolsModal';

const DonutChart: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const radius = 40;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: '100px', height: '100px' }}>
        <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="50" cy="50" r={normalizedRadius}
            fill="none" stroke="#1e293b" strokeWidth={strokeWidth}
          />
          <circle
            cx="50" cy="50" r={normalizedRadius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{Math.round(clampedValue)}%</span>
        </div>
      </div>
      <span style={{ marginTop: '12px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
};

const GaugeWidget: React.FC<{ value: number; label: string; color: string; format?: string }> = ({ value, label, color, format = '%' }) => {
  const radius = 50;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '24px 20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ position: 'relative', width: '100px', height: '55px', overflow: 'hidden' }}>
        <svg width="100" height="100" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <filter id={`glow-${label.replace(/\\s+/g, '')}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d={`M ${strokeWidth/2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} ${radius}`}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${strokeWidth/2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} ${radius}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#glow-${label.replace(/\\s+/g, '')})`}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
      </div>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>
          {value}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8', marginLeft: '4px' }}>{format}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
      </div>
    </div>
  );
};

const LatencyWidget: React.FC<{ value: number; label: string; unit: string; color: string }> = ({ value, label, unit, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '24px 20px', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', minHeight: '135px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1, textShadow: `0 0 15px ${color}50` }}>
          {value === 0 ? '<1' : value}
        </div>
        <div style={{ fontSize: '1.2rem', color: '#cbd5e1', fontWeight: 500 }}>
          {unit}
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}></div>
        {label}
      </div>
    </div>
  </div>
);

interface DeviceDetailsProps {
  device: NetworkDevice;
  onBack: () => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, onBack, onDelete, onRefresh }) => {
  const [pingLog, setPingLog] = useState<string[]>([]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`/api/v1/metadata/devices/${device.id}/diagnostic-logs`);
      const rawLogs = response.data.logs || [];
      setPingLog(rawLogs);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [device.id]);

  const [runningDiagnostic, setRunningDiagnostic] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isEditProtocolsOpen, setIsEditProtocolsOpen] = useState(false);

  const [liveMetrics, setLiveMetrics] = useState({
    cpu: device.cpuUsagePercent || 0,
    memory: device.memoryUsagePercent || 0,
    storage: device.storageUsagePercent || 0,
    latency: device.latencyMs || 0,
    packetLoss: device.packetLossPercent || 0
  });

  useEffect(() => {
    // EventSource doesn't use axios.defaults.baseURL, so we must explicitly point it to the backend!
    const backendUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    const eventSource = new EventSource(`${backendUrl}/api/v1/query/stream/${device.id}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLiveMetrics({
        cpu: data.cpu_usage_percent,
        memory: data.memory_usage_percent,
        storage: data.storage_usage_percent,
        latency: data.latency_ms ?? 0,
        packetLoss: data.packet_loss ?? 0
      });
    };
    
    return () => {
      eventSource.close();
    };
  }, [device.id]);

  const handleForceDiscovery = async () => {
    setIsDiscovering(true);
    try {
      await axios.post(`/api/v1/metadata/devices/${device.id}/force-discovery`);
      alert("Discovery scan queued! The agent will update the metadata shortly.");
    } catch (err) {
      console.error("Failed to queue discovery", err);
      alert("Failed to queue discovery scan.");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleRunDiagnostic = async (protocol: string) => {
    setRunningDiagnostic(protocol);
    try {
      await axios.post(`/api/v1/metadata/devices/${device.id}/diagnose`, { protocol });
      await fetchLogs();
      if (onRefresh) onRefresh();
    } catch (err) {
      setPingLog((prev) => [...prev, `[ERROR] Failed to run live ${protocol.toUpperCase()} probe`]);
    } finally {
      setRunningDiagnostic(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#f8fafc' }}>
      {/* Back Button & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ← Back to Devices
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleForceDiscovery}
            disabled={isDiscovering}
            style={{
              background: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isDiscovering ? 'not-allowed' : 'pointer',
              opacity: isDiscovering ? 0.7 : 1,
            }}
          >
            {isDiscovering ? 'Queuing...' : 'Re-run Discovery'}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(device.id)}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )}
          <StatusBadge status={device.status} />
        </div>
      </div>

      {/* Main Info Card */}
      <div
        style={{
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
            {device.name}
          </h2>
          <span
            style={{
              fontSize: '0.75rem',
              background: '#0284c7',
              padding: '2px 8px',
              borderRadius: '4px',
              color: '#fff',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {device.type}
          </span>
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #1e293b',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>IP Address</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace', marginTop: '4px' }}>
              {device.ip}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>MAC Address</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#cbd5e1', fontFamily: 'monospace', marginTop: '4px' }}>
              {device.mac}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Hardware Model</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f1f5f9', marginTop: '4px' }}>
              {device.model || 'Standard Network Node'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Location / Rack</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f1f5f9', marginTop: '4px' }}>
              {device.location}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Uptime</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#10b981', marginTop: '4px' }}>
              {device.uptime}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Monitoring Protocol</div>
              <button 
                onClick={() => setIsEditProtocolsOpen(true)}
                style={{ background: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#94a3b8', fontSize: '0.65rem', padding: '2px 6px', cursor: 'pointer' }}
              >
                Edit
              </button>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8', marginTop: '4px', textTransform: 'uppercase' }}>
              {device.monitoring ? (
                <>
                  {device.monitoring.methods
                    ? device.monitoring.methods.map((m) => m.toUpperCase()).join(' + ')
                    : (device.monitoring as any).method?.toUpperCase()}
                  {device.monitoring.snmpVersion ? ` (${device.monitoring.snmpVersion})` : ''}
                  <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'none', marginLeft: '6px' }}>
                    @{device.monitoring.intervalSeconds || 30}s
                  </span>
                </>
              ) : (
                'ICMP Ping @30s'
              )}
            </div>
          </div>
        </div>
      </div>
      
      <EditProtocolsModal 
        isOpen={isEditProtocolsOpen} 
        onClose={() => setIsEditProtocolsOpen(false)} 
        device={device} 
        onUpdate={() => { if (onRefresh) onRefresh(); }}
      />

      {/* Connection Health Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <GaugeWidget 
          value={device.availability24hPercent ?? 100} 
          label="24h Availability" 
          color={(device.availability24hPercent ?? 100) < 90 ? '#ef4444' : ((device.availability24hPercent ?? 100) < 99 ? '#f59e0b' : '#4ade80')} 
        />
        <GaugeWidget 
          value={liveMetrics.packetLoss} 
          label="Live Packet Loss" 
          color={liveMetrics.packetLoss === 0 ? '#4ade80' : (liveMetrics.packetLoss > 50 ? '#ef4444' : '#f59e0b')} 
        />
        <LatencyWidget 
          value={liveMetrics.latency} 
          label="Live Response Time" 
          unit="ms" 
          color={liveMetrics.latency < 50 ? '#4ade80' : (liveMetrics.latency < 150 ? '#f59e0b' : '#ef4444')}
        />
      </div>

      {/* 24 Hour Timeline */}
      <AvailabilityTimeline data={device.timeline24h} />

      {/* Utilization & Diagnostics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Bento Box Resource Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* CPU Card */}
          <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '24px' }}>
            {device.snmp_data?.CPU?.Cores ? (
              <CpuCoresGraph cores={device.snmp_data.CPU.Cores} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minHeight: '120px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>Total CPU Usage</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', lineHeight: 1 }}>
                    {liveMetrics.cpu.toFixed(1)}<span style={{ fontSize: '1.2rem', color: '#94a3b8', marginLeft: '2px' }}>%</span>
                  </div>
                </div>
                <div style={{ height: '12px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${liveMetrics.cpu}%`, 
                    background: 'linear-gradient(90deg, #0284c7, #38bdf8)', 
                    borderRadius: '999px', 
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.5)' 
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  <span>0%</span>
                  <span style={{ color: '#38bdf8', opacity: 0.8, letterSpacing: '0.05em' }}>● LIVE STREAM</span>
                  <span>100%</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* RAM Card */}
            <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <DonutChart value={liveMetrics.memory} label="System RAM" color="#10b981" />
            </div>

            {/* Storage Card */}
            <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <DonutChart value={liveMetrics.storage} label="Disk Storage" color="#ef4444" />
            </div>
          </div>

          {/* Throughput Card */}
          <div style={{ background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>Network Throughput</h3>
              <span style={{ fontWeight: 600, color: '#a855f7' }}>
                {device.snmp_data?.Interfaces ? 
                    Object.values(device.snmp_data.Interfaces).reduce((acc: number, curr: any) => acc + parseFloat(curr.In || '0') + parseFloat(curr.Out || '0'), 0).toFixed(2) 
                    : device.bandwidthUsageMbps} Mbps
              </span>
            </div>
            
            {/* Live Streaming Graph */}
            <ThroughputGraph 
              initialHistory={device.throughput_history}
              currentValue={device.snmp_data?.Interfaces ? 
                Object.values(device.snmp_data.Interfaces).reduce((acc: number, curr: any) => acc + parseFloat(curr.In || '0') + parseFloat(curr.Out || '0'), 0)
                : device.bandwidthUsageMbps} 
            />
          </div>

        </div>

        {/* Diagnostic Terminal Card */}
        <div
          style={{
            background: '#0f172a',
            borderRadius: '16px',
            border: '1px solid #1e293b',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
              Diagnostic Terminal
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(device.monitoring?.methods || []).map(method => {
                const isRunning = runningDiagnostic === method;
                let bgColor = '#334155';
                let label = `Send ${method.toUpperCase()} Probe`;
                if (method === 'icmp') { bgColor = '#2563eb'; label = 'Send ICMP Ping'; }
                if (method === 'snmp') { bgColor = '#8b5cf6'; label = 'Send SNMP Poll'; }
                if (method === 'wmi') { bgColor = '#0ea5e9'; label = 'Send WMI Query'; }
                if (method === 'http') { bgColor = '#10b981'; label = 'Send HTTP GET'; }
                if (method === 'tcp') { bgColor = '#f59e0b'; label = 'Send TCP Probe'; }
                if (method === 'ssh') { bgColor = '#ef4444'; label = 'Send SSH Probe'; }
                
                return (
                  <button
                    key={method}
                    onClick={() => handleRunDiagnostic(method)}
                    disabled={runningDiagnostic !== null}
                    style={{
                      background: bgColor,
                      color: '#fff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: runningDiagnostic !== null ? 'not-allowed' : 'pointer',
                      opacity: runningDiagnostic !== null && !isRunning ? 0.5 : 1
                    }}
                  >
                    {isRunning ? 'Running...' : label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: '#080c14',
              borderRadius: '8px',
              padding: '12px 16px',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: '#34d399',
              minHeight: '140px',
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid #1e293b',
            }}
          >
            {pingLog.length === 0 ? (
              <span style={{ color: '#64748b' }}>Ready. Click "Send ICMP Ping" to diagnose node connectivity.</span>
            ) : (
              pingLog.map((line, idx) => <div key={idx} style={{ margin: '2px 0' }}>{line}</div>)
            )}
          </div>
        </div>
      </div>

      {/* SNMP Telemetry Data */}
      <div
        style={{
          background: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #1e293b',
          padding: '24px',
          marginTop: '4px'
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700 }}>
          Network Interfaces & System Info
        </h3>
        
        {device.snmp_data && !device.snmp_data.error && device.status === 'online' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>OS Description:</span> <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{device.snmp_data.System?.Description || 'N/A'}</span></div>
              <div style={{ marginBottom: '8px' }}><span style={{ color: '#94a3b8' }}>Hostname:</span> <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{device.snmp_data.System?.Hostname || 'N/A'}</span></div>
              <div><span style={{ color: '#94a3b8' }}>System Uptime:</span> <span style={{ color: '#10b981', fontFamily: 'monospace' }}>{device.snmp_data.System?.Uptime || 'N/A'}</span></div>
            </div>

            {device.snmp_data.Interfaces && Object.keys(device.snmp_data.Interfaces).length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Interface</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Inbound</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Outbound</th>
                      <th style={{ padding: '12px 8px', fontWeight: 600 }}>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(device.snmp_data.Interfaces).map(([name, data]: [string, any], idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 8px', color: '#e2e8f0' }}>{name}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: data.Status === 'UP' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: data.Status === 'UP' ? '#10b981' : '#ef4444'
                          }}>
                            {data.Status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: '#38bdf8' }}>{data.In}</td>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: '#a855f7' }}>{data.Out}</td>
                        <td style={{ padding: '12px 8px', fontFamily: 'monospace', color: data.Errors === '0' ? '#94a3b8' : '#ef4444' }}>{data.Errors}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', background: '#1e293b', borderRadius: '8px', color: '#64748b', fontSize: '0.9rem' }}>
            {device.status === 'offline' ? 'Device is offline. SNMP data unavailable.' : 'No SNMP telemetry data available for this device yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceDetails;
