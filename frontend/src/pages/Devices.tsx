import React from 'react';
import { DeviceTable } from '../components/dashboard/DeviceTable';
import { NetworkDevice } from '../types/device';

interface DevicesProps {
  devices: NetworkDevice[];
  onSelectDevice: (device: NetworkDevice) => void;
  onDeleteDevice?: (id: string) => void;
}

export const Devices: React.FC<DevicesProps> = ({ devices, onSelectDevice, onDeleteDevice }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Info & Actions */}
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
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
            Hardware Inventory & Node Directory
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Manage routing hardware, network interfaces, IP mappings, and physical locations
          </p>
        </div>

        <div>
          <button
            onClick={() => alert('Exporting device inventory to CSV...')}
            style={{
              background: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #334155',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⬇ Export (CSV)
          </button>
        </div>
      </div>

      <DeviceTable
        devices={devices}
        onSelectDevice={onSelectDevice}
        onDeleteDevice={onDeleteDevice}
      />
    </div>
  );
};

export default Devices;
