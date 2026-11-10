'use client';

import React from 'react';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileGuideModal({ isOpen, onClose }: MobileGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">📱 Mobile Push Notifications</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">✕</button>
        </div>
        <div className="text-xs text-gray-600 space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="font-semibold text-blue-900">✅ In-App Push is 100% Active:</p>
            <p className="mt-1 text-blue-800">
              Your phone vibrates, chimes, and drops down live alert cards whenever new jobs arrive.
            </p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-semibold text-amber-900">🔔 Background OS Lockscreen Push (Chrome Android):</p>
            <p className="mt-1 text-amber-800">
              Chrome on Android requires secure origins for lockscreen push. To enable it on HTTP:
            </p>
            <ol className="list-decimal pl-4 mt-2 space-y-1 text-amber-900 font-mono text-[11px]">
              <li>Open <b>chrome://flags</b> in mobile Chrome</li>
              <li>Search for <b>Insecure origins treated as secure</b></li>
              <li>Add <b>http://{typeof window !== 'undefined' ? window.location.host : '192.168.31.212:3000'}</b></li>
              <li>Enable and tap <b>Relaunch</b></li>
            </ol>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-blue-600 text-white font-medium text-xs rounded-lg hover:bg-blue-700 cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

