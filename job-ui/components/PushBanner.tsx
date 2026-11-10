'use client';

import React from 'react';

export interface PushAlertData {
  id: string;
  title: string;
  body: string;
  url?: string;
  timestamp: string;
}

interface PushBannerProps {
  alert: PushAlertData | null;
  onDismiss: () => void;
  onAction?: (url?: string) => void;
}

export default function PushBanner({ alert, onDismiss, onAction }: PushBannerProps) {
  if (!alert) return null;

  const handleOpen = () => {
    if (onAction) {
      onAction(alert.url);
    } else if (alert.url && alert.url !== '#') {
      window.open(alert.url, '_blank');
    }
    onDismiss();
  };

  return (
    <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 transition-all duration-300 transform translate-y-0">
      <div className="bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-gray-700 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-lg shadow-sm">
          🔔
        </div>

        <div className="flex-1 min-w-0" onClick={handleOpen}>
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-400">
              Live Job Alert
            </span>
            <span className="text-[10px] text-gray-400">Just now</span>
          </div>
          <h4 className="text-sm font-semibold text-white leading-tight truncate">
            {alert.title}
          </h4>
          <p className="text-xs text-gray-300 mt-1 line-clamp-2 leading-snug">
            {alert.body}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpen}
              className="text-xs font-semibold px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer"
            >
              View Job
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:text-white text-base leading-none p-1 cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

