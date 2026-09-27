import React from 'react';
import { Sidebar, NavItemKey } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenAddDevice?: () => void;
  isBackendOnline?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentTab,
  onSelectTab,
  title,
  subtitle,
  onRefresh,
  isRefreshing,
  onOpenAddDevice,
  isBackendOnline,
}) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0b0f19' }}>
      {/* Exact NetMonitor Sidebar */}
      <Sidebar currentTab={currentTab} onSelectTab={onSelectTab} alertCount={3} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onOpenAddDevice={onOpenAddDevice}
          isBackendOnline={isBackendOnline}
        />
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
