'use client';

import React from 'react';
import {
  FolderConfig,
  NotificationStats,
  ProcessingHistoryItem,
} from '../lib/types';

interface OverviewStatsProps {
  folders?: FolderConfig[];
  totalJobs: number;
  processingHistory?: ProcessingHistoryItem[];
  notifStats?: NotificationStats;
  isLoading: boolean;
}

export default function OverviewStats({
  folders = [],
  totalJobs = 0,
  processingHistory = [],
  notifStats,
  isLoading,
}: OverviewStatsProps) {
  const activeFolders = folders.filter((f) => f.isActive).length;
  const inactiveFolders = folders.length - activeFolders;
  const successCsvs = processingHistory.filter((p) => p.status === 'success').length;
  const failedCsvs = processingHistory.filter((p) => p.status === 'failed').length;

  const cards = [
    { label: 'Total Registered Folders', value: folders.length, color: 'text-gray-900', bg: 'bg-blue-50' },
    { label: 'Active Folders Watching', value: activeFolders, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inactive Folders', value: inactiveFolders, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Jobs Detected', value: totalJobs, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Processed CSV Files', value: successCsvs, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Failed CSV Jobs', value: failedCsvs, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Pending Notifications', value: notifStats?.pending ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Sent Notifications', value: notifStats?.sent ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">System Overview &amp; Live Status</h2>
        <p className="text-sm text-gray-500">Real-time health and synchronization metrics across watched directories and queues.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{c.label}</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className={`text-3xl font-extrabold ${c.color}`}>
                {isLoading ? '...' : c.value}
              </span>
              <span className={`text-xs px-2 py-1 rounded-md font-medium ${c.bg} ${c.color}`}>
                Live
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

