'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import Navbar from '../components/Navbar';
import OverviewStats from '../components/OverviewStats';
import FoldersTab from '../components/FoldersTab';
import JobsTab from '../components/JobsTab';
import ProcessingTab from '../components/ProcessingTab';
import NotificationsTab from '../components/NotificationsTab';
import Providers from '../components/Providers';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'folders' | 'jobs' | 'processing' | 'notifications'
  >('overview');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: folders = [], refetch: refetchFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: api.getFolders,
  });

  const { data: jobsResponse, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs', search, page],
    queryFn: () => api.getJobs({ search, page, limit: 20 }),
  });

  const { data: processingHistory = [], refetch: refetchProcessing } = useQuery({
    queryKey: ['processingHistory'],
    queryFn: api.getProcessingHistory,
  });

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
  });

  const { data: notifStats } = useQuery({
    queryKey: ['notifStats'],
    queryFn: api.getNotificationStats,
  });

  const refetchAll = () => {
    refetchFolders();
    refetchProcessing();
    refetchNotifications();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewStats
            folders={folders}
            totalJobs={jobsResponse?.total || 0}
            processingHistory={processingHistory}
            notifStats={notifStats}
            isLoading={isLoadingJobs}
          />
        )}

        {activeTab === 'folders' && (
          <FoldersTab
            folders={folders}
            refetch={refetchAll}
            showToast={showToast}
          />
        )}

        {activeTab === 'jobs' && (
          <JobsTab
            jobs={jobsResponse?.data || []}
            total={jobsResponse?.total || 0}
            page={page}
            setPage={setPage}
            search={search}
            setSearch={setSearch}
            isLoading={isLoadingJobs}
          />
        )}

        {activeTab === 'processing' && (
          <ProcessingTab
            history={processingHistory}
            refetch={refetchProcessing}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab
            notifications={notifications}
            refetch={refetchNotifications}
            showToast={showToast}
          />
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  );
}
