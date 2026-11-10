'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  initialPath?: string;
}

export default function FolderBrowserModal({
  isOpen,
  onClose,
  onSelect,
  initialPath,
}: FolderBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState<string | undefined>();
  const [directories, setDirectories] = useState<Array<{ name: string; path: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadDirectories = async (target?: string) => {
    setIsLoading(true);
    try {
      const data = await api.browseFolders(target);
      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDirectories(currentPath || undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = directories.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const quickJump = (target: string) => {
    loadDirectories(target);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Select Directory from Local Machine</h3>
            <p className="text-xs text-gray-500">Navigate or copy/paste any folder to monitor for CSV files</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">✕</button>
        </div>

        {/* Current Path Bar */}
        <div className="py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">Path:</span>
            <input
              type="text"
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadDirectories(currentPath);
              }}
              className="flex-1 font-mono text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => loadDirectories(currentPath)}
              className="text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md cursor-pointer"
            >
              Go
            </button>
          </div>

          {/* Quick Jump Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-gray-400 font-medium">Quick Jump:</span>
            <button
              type="button"
              onClick={() => quickJump('Desktop')}
              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 font-medium cursor-pointer"
            >
              🖥️ Desktop
            </button>
            <button
              type="button"
              onClick={() => quickJump('C:/')}
              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 font-medium cursor-pointer"
            >
              💾 C:\ Drive
            </button>
            <button
              type="button"
              onClick={() => quickJump('.')}
              className="px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 font-medium cursor-pointer"
            >
              📁 Current Project
            </button>
            {parentPath && (
              <button
                type="button"
                onClick={() => loadDirectories(parentPath)}
                className="ml-auto text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                ↑ Up one level
              </button>
            )}
          </div>

          <div className="flex justify-between items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Filter directories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-md w-full"
            />
          </div>
        </div>

        {/* Directories List */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg p-2 divide-y divide-gray-50 min-h-[220px]">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-gray-400">Loading directories...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">No subdirectories found</div>
          ) : (
            filtered.map((d) => (
              <div
                key={d.path}
                onDoubleClick={() => loadDirectories(d.path)}
                className="flex justify-between items-center py-2 px-2.5 hover:bg-blue-50/60 rounded-md cursor-pointer transition group"
              >
                <div
                  onClick={() => loadDirectories(d.path)}
                  className="flex items-center gap-2 flex-1"
                >
                  <span className="text-base text-amber-500">📁</span>
                  <span className="text-xs font-semibold text-gray-800 group-hover:text-blue-600">
                    {d.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    onSelect(d.path);
                    onClose();
                  }}
                  className="text-[11px] font-semibold px-2 py-1 bg-white border border-gray-200 hover:bg-blue-600 hover:text-white rounded shadow-2xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                >
                  Choose
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 flex justify-between items-center">
          <span className="text-xs text-gray-400">Double click folder to open it</span>
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSelect(currentPath);
                onClose();
              }}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              Select Current Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
