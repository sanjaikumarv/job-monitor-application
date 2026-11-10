'use client';

import React, { useState } from 'react';
import { useWebPush } from '../lib/useWebPush';
import PushBanner from './PushBanner';
import MobileGuideModal from './MobileGuideModal';

interface NavbarProps {
  activeTab: 'overview' | 'folders' | 'jobs' | 'processing' | 'notifications';
  setActiveTab: (tab: 'overview' | 'folders' | 'jobs' | 'processing' | 'notifications') => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export default function Navbar({ activeTab, setActiveTab, showToast }: NavbarProps) {
  const {
    permission,
    isRegistering,
    activeAlert,
    isMobileDevice,
    dismissAlert,
    requestAndRegister,
    broadcastToAll,
  } = useWebPush();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showMobileGuide, setShowMobileGuide] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    try {
      const res = await broadcastToAll(
        'New Job Opportunity Alert!',
        'A new verified job opportunity is available on Job Monitor System.',
      );
      showToast?.(`📢 Push dispatched to ${res.sentCount || 0} device(s)!`, 'success');
      setMobileMenuOpen(false);
    } catch {
      showToast?.('Failed to send broadcast push notification', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Dashboard Overview', shortLabel: 'Overview', icon: '📊' },
    { id: 'folders', label: 'Folder Monitoring', shortLabel: 'Folders', icon: '📁' },
    { id: 'jobs', label: 'Job Management', shortLabel: 'Jobs', icon: '💼' },
    { id: 'processing', label: 'Processing History', shortLabel: 'Processing', icon: '⚡' },
    { id: 'notifications', label: 'Notification History', shortLabel: 'Alerts', icon: '🔔' },
  ] as const;

  return (
    <>
      <PushBanner
        alert={activeAlert}
        onDismiss={dismissAlert}
        onAction={(url) => {
          if (url && url !== '#') window.open(url, '_blank');
          else setActiveTab('jobs');
        }}
      />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            {/* Brand Logo & Name */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg shadow-sm shrink-0">
                JM
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight truncate">
                  Job Monitor<span className="hidden sm:inline"> System</span>
                </h1>
                <p className="hidden sm:block text-xs text-gray-500 font-medium truncate">
                  Chokidar &amp; BullMQ Notification Engine
                </p>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2.5">
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition border border-blue-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                title="Send live push notification to all devices"
              >
                <span>📢</span>
                <span>{isBroadcasting ? 'Pushing...' : 'Push to All Devices'}</span>
              </button>

              {permission === 'granted' ? (
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg flex items-center gap-1 border border-emerald-200">
                  🔔 Push Enabled
                </span>
              ) : (
                <button
                  onClick={requestAndRegister}
                  disabled={isRegistering}
                  className="text-xs px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg transition border border-amber-200 cursor-pointer"
                >
                  {isRegistering ? 'Enabling...' : '🔔 Enable Push'}
                </button>
              )}

              {isMobileDevice && (
                <button
                  onClick={() => setShowMobileGuide(true)}
                  className="text-[11px] px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg border border-indigo-200 cursor-pointer"
                >
                  📱 Mobile Tips
                </button>
              )}

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
            </div>

            {/* Mobile Actions: Broadcast Pill & Hamburger Menu */}
            <div className="flex md:hidden items-center space-x-1.5">
              <button
                onClick={handleBroadcast}
                disabled={isBroadcasting}
                className="text-[11px] px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                <span>📢</span>
                <span>{isBroadcasting ? '...' : 'Push'}</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 focus:outline-hidden cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                <span className="text-lg leading-none">{mobileMenuOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-gray-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleBroadcast}
                  disabled={isBroadcasting}
                  className="w-full text-xs py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition cursor-pointer text-center flex items-center justify-center gap-1"
                >
                  <span>📢</span>
                  <span>{isBroadcasting ? 'Broadcasting...' : 'Push All Devices'}</span>
                </button>

                {permission === 'granted' ? (
                  <div className="text-xs py-2 px-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200 text-center flex items-center justify-center gap-1">
                    <span>🔔</span>
                    <span>Push Active</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      requestAndRegister();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isRegistering}
                    className="w-full text-xs py-2 px-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition cursor-pointer text-center"
                  >
                    {isRegistering ? 'Enabling...' : '🔔 Enable Push'}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    setShowMobileGuide(true);
                    setMobileMenuOpen(false);
                  }}
                  className="text-xs px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  <span>📱</span>
                  <span>Mobile OS Push Setup Tips</span>
                </button>

                <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 mr-1 bg-emerald-500 rounded-full animate-pulse" />
                  Engine Active
                </span>
              </div>
            </div>
          )}

          {/* Responsive Scrollable Tab Strip */}
          <nav className="flex space-x-1 -mb-px overflow-x-auto scrollbar-none pb-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 sm:py-3 px-2.5 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="inline sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <MobileGuideModal isOpen={showMobileGuide} onClose={() => setShowMobileGuide(false)} />
    </>
  );
}
