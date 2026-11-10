'use client';

import React, { useState } from 'react';
import { JobRecord } from '../lib/types';

interface JobsTabProps {
  jobs: JobRecord[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  isLoading: boolean;
}

export default function JobsTab({
  jobs,
  total,
  page,
  setPage,
  search,
  setSearch,
  isLoading,
}: JobsTabProps) {
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between gap-4 items-center">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job title, company, or skills..."
            className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Showing {jobs.length} of {total} jobs detected
        </div>
      </div>

      {/* Jobs Grid/Table */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
          No jobs found matching your criteria. Ensure monitored folders contain valid CSV files.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <div
              key={job.jobId}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-blue-300 transition flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-bold text-gray-900">{job.jobTitle}</h4>
                  {job.matchScore && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      Score: {job.matchScore}
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-700">{job.companyName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>📍 {job.location}</span>
                  <span>💼 {job.employmentType || job.workMode}</span>
                  <span>⏳ {job.experience}</span>
                  <span>💰 {job.salary}</span>
                  <span>📁 {job.source}</span>
                </div>
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.slice(0, 6).map((skill, idx) => (
                      <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-md font-medium">
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 6 && (
                      <span className="text-xs text-gray-400 self-center">+{job.skills.length - 6} more</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="text-xs font-semibold px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  View Details
                </button>
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Apply Now →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-600 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedJob.jobTitle}</h3>
                <p className="text-sm font-semibold text-gray-600">{selectedJob.companyName}</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="border-t border-b border-gray-100 py-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><strong>Location:</strong> {selectedJob.location}</div>
              <div><strong>Salary:</strong> {selectedJob.salary}</div>
              <div><strong>Experience:</strong> {selectedJob.experience}</div>
              <div><strong>Source File:</strong> {selectedJob.sourceFileName || 'Direct CSV'}</div>
            </div>
            <div>
              <h5 className="text-xs font-bold text-gray-700 uppercase mb-1">Description &amp; Details</h5>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
            </div>
            {selectedJob.matchExplanation && (
              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-900">
                <strong>Match Explanation:</strong> {selectedJob.matchExplanation}
              </div>
            )}
            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-xs border border-gray-300 rounded-lg text-gray-700"
              >
                Close
              </button>
              <a
                href={selectedJob.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg font-bold"
              >
                Apply Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

