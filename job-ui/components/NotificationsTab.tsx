'use client';

import React from 'react';
import { api } from '../lib/api';
import { NotificationTask } from '../lib/types';

interface NotificationsTabProps {
  notifications: NotificationTask[];
  refetch: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function NotificationsTab({
  notifications,
  refetch,
  showToast,
}: NotificationsTabProps) {
  const handleRetry = async (id: string) => {
    try {
      await api.retryNotification(id);
      showToast('Notification re-queued for delivery.');
      refetch();
    } catch {
      showToast('Failed to retry notification.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">Notification Dispatch History</h3>
          <p className="text-xs text-gray-500">Real-time status of Nodemailer emails and FCM Push notifications</p>
        </div>
        <button onClick={refetch} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Refresh</button>
      </div>

      {notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No notifications recorded yet. Notifications trigger automatically when new CSV jobs are processed.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Job Opportunity</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Attempts</th>
                <th className="px-6 py-3">Queued At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notifications.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 text-xs">{task.job.jobTitle}</div>
                    <div className="text-xs text-gray-500">{task.job.companyName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${
                        task.channel === 'email'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {task.channel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-600 truncate max-w-xs">{task.recipient}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        task.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'pending' || task.status === 'processing'
                          ? 'bg-amber-100 text-amber-800'
                          : task.status === 'partially_sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.error && (
                      <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-xs">{task.error}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs">{task.attempts} / {task.maxAttempts}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(task.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(task.status === 'failed' || task.status === 'partially_sent') && (
                      <button
                        onClick={() => handleRetry(task.id)}
                        className="text-xs font-semibold px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition"
                      >
                        Retry ↻
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

