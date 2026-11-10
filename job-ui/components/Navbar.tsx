'use client';

import React from 'react';
import { useWebPush } from '../lib/useWebPush';

interface NavbarProps {
  activeTab: 'overview' | 'folders' | 'jobs' | 'processing' | 'notifications';
  setActiveTab: (tab: 'overview' | 'folders' | 'jobs' | 'processing' | 'notifications') => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { isSupported, permission, isRegistering, requestAndRegister } = useWebPush();

  const tabs = [
    { id: 'overview', label: 'Dashboard Overview' },
    { id: 'folders', label: 'Folder Monitoring' },
    { id: 'jobs', label: 'Job Management' },
    { id: 'processing', label: 'Processing History' },
    { id: 'notifications', label: 'Notification History' },
  ] as const;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              JM
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Job Monitor System</h1>
              <p className="text-xs text-gray-500 font-medium">Chokidar &amp; BullMQ Notification Engine</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isSupported && (
              permission === 'granted' ? (
                <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg flex items-center gap-1 border border-blue-200">
                  🔔 Push Enabled
                </span>
              ) : (
                <button
                  onClick={requestAndRegister}
                  disabled={isRegistering}
                  className="text-xs px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg transition border border-amber-200 cursor-pointer"
                >
                  {isRegistering ? 'Enabling...' : '🔔 Enable Web Push'}
                </button>
              )
            )}

            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Engine Active
            </span>
          </div>
        </div>

        {/* Tab Strip */}
        <nav className="flex space-x-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
