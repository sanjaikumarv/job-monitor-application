'use client';

import React from 'react';
import { FolderConfig } from '../lib/types';

interface FolderListTableProps {
  folders: FolderConfig[];
  refetch: () => void;
  onToggleStatus: (folder: FolderConfig) => void;
  onDeleteFolder: (id: string, name: string) => void;
}

export default function FolderListTable({
  folders,
  refetch,
  onToggleStatus,
  onDeleteFolder,
}: FolderListTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-900">Configured Watch Folders ({folders.length})</h3>
        <button onClick={refetch} className="text-xs font-semibold text-blue-600 hover:text-blue-800">
          Refresh
        </button>
      </div>
      {folders.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No folders registered yet. Add a directory above to begin monitoring.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Folder Name</th>
                <th className="px-6 py-3">Path</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Recursive</th>
                <th className="px-6 py-3">Last Event</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {folders.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-900">{f.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500 truncate max-w-xs">{f.path}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        f.isActive && f.status === 'watching'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.isActive ? '● Watching' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{f.recursive ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {f.lastEventTime ? new Date(f.lastEventTime).toLocaleTimeString() : 'No events'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => onToggleStatus(f)}
                      className={`text-xs px-3 py-1 rounded-md font-medium transition ${
                        f.isActive
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {f.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onDeleteFolder(f.id, f.name)}
                      className="text-xs px-3 py-1 rounded-md font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                    >
                      Delete
                    </button>
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

