'use client';

import React, { useState } from 'react';
import { ProcessingHistoryItem } from '../lib/types';

interface ProcessingTabProps {
  history: ProcessingHistoryItem[];
  refetch: () => void;
}

export default function ProcessingTab({ history, refetch }: ProcessingTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">CSV Ingestion &amp; Processing History</h3>
          <p className="text-xs text-gray-500">Audit trail of filesystem events, fingerprint checks, and parsing runs</p>
        </div>
        <button onClick={refetch} className="text-xs font-semibold text-blue-600 hover:text-blue-800">Refresh</button>
      </div>

      {history.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No processing events recorded yet. Files placed in monitored folders will appear here.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">CSV Filename</th>
                <th className="px-6 py-3">Folder</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Valid / Total</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Processed At</th>
                <th className="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item) => (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">{item.fileName}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{item.folderName}</td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase">{item.eventType}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold text-emerald-600">{item.recordsValid}</span>
                      <span className="text-gray-400"> / </span>
                      <span>{item.recordsTotal}</span>
                      {item.recordsFailed > 0 && (
                        <span className="ml-1 text-rose-600 font-bold">({item.recordsFailed} failed)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">{item.durationMs}ms</td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {new Date(item.processedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.errors.length > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          className="text-xs text-rose-600 font-semibold hover:underline"
                        >
                          {expandedId === item.id ? 'Hide Errors' : `View Errors (${item.errors.length})`}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === item.id && item.errors.length > 0 && (
                    <tr className="bg-rose-50/50">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-rose-800 uppercase">Processing Errors:</h5>
                          <div className="max-h-40 overflow-y-auto space-y-1 text-xs text-rose-700 font-mono">
                            {item.errors.map((e, idx) => (
                              <div key={idx}>
                                • Line {e.line} [{e.field || 'general'}]: {e.message}
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

