"use client";

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { api } from "../lib/api";
import { FolderConfig } from "../lib/types";
import FolderBrowserModal from "./FolderBrowserModal";
import FolderListTable from "./FolderListTable";

interface FoldersTabProps {
  folders: FolderConfig[];
  refetch: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface FormValues {
  name: string;
  path: string;
  recursive: boolean;
}

export default function FoldersTab({
  folders,
  refetch,
  showToast,
}: FoldersTabProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit, reset, setValue, getValues, watch } =
    useForm<FormValues>({
      defaultValues: { name: "", path: "", recursive: true },
    });

  const currentPathValue = watch("path");
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await api.createFolder(values);
      showToast("Folder registered and monitoring started successfully!");
      reset();
      refetch();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to register folder";
      showToast(String(msg), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPath = (selectedPath: string) => {
    setValue("path", selectedPath, { shouldValidate: true });
    if (!getValues("name")) {
      const baseName =
        selectedPath.split(/[/\\]/).filter(Boolean).pop() || "Job Folder";
      setValue("name", baseName);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleSelectPath(text.trim());
        showToast("Pasted path from clipboard!");
      }
    } catch {
      showToast("Could not read clipboard. Please paste manually.", "error");
    }
  };

  const handleNativeFolderPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const fileWithPossiblePath = firstFile as File & { path?: string };
      const rawPath = fileWithPossiblePath.path;
      if (rawPath) {
        const dirPath = rawPath.substring(
          0,
          Math.max(rawPath.lastIndexOf("/"), rawPath.lastIndexOf("\\")),
        );
        handleSelectPath(dirPath);
        showToast("Local directory selected!");
      } else {
        const rel = firstFile.webkitRelativePath;
        const folderName = rel.split("/")[0] || firstFile.name;
        if (!getValues("name")) setValue("name", folderName);
        setIsBrowserOpen(true);
      }
    }
  };

  const toggleStatus = async (folder: FolderConfig) => {
    try {
      if (folder.isActive) {
        await api.deactivateFolder(folder.id);
        showToast(`Stopped monitoring ${folder.name}`);
      } else {
        await api.activateFolder(folder.id);
        showToast(`Monitoring activated for ${folder.name}`);
      }
      refetch();
    } catch {
      showToast("Failed to toggle folder monitoring status", "error");
    }
  };

  const deleteFolder = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete monitoring for "${name}"?`))
      return;
    try {
      await api.deleteFolder(id);
      showToast(`Removed folder "${name}"`);
      refetch();
    } catch {
      showToast("Failed to delete folder", "error");
    }
  };

  return (
    <div className='space-y-8'>
      {/* Registration Form */}
      <div className='bg-white p-6 rounded-xl border border-gray-200 shadow-xs'>
        <h3 className='text-lg font-bold text-gray-900 mb-1'>
          Register Directory for Automated Monitoring
        </h3>
        <p className='text-xs text-gray-500 mb-4'>
          Support both: browse local folder directory or copy &amp; paste folder
          path.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='grid grid-cols-1 md:grid-cols-12 gap-4 items-end'>
          <div className='md:col-span-4'>
            <label className='block text-xs font-semibold text-gray-700 uppercase mb-1'>
              Folder Name
            </label>
            <input
              {...register("name", { required: true })}
              placeholder='e.g. Software Engineering Jobs'
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden'
            />
          </div>

          <div className='md:col-span-5'>
            <div className='flex justify-between items-center mb-1'>
              <label className='block text-xs font-semibold text-gray-700 uppercase'>
                Absolute Directory Path
              </label>
              <div className='flex items-center space-x-2 text-[11px]'>
                <button
                  type='button'
                  onClick={handlePasteClipboard}
                  className='text-blue-600 hover:text-blue-800 font-medium cursor-pointer'>
                  📋 Paste Path
                </button>
              </div>
            </div>

            <div className='relative flex rounded-lg shadow-2xs'>
              <input
                {...register("path", {
                  required: true,
                  onChange: (e) => {
                    const val = e.target.value;
                    if (val && !getValues("name")) {
                      const baseName = val.split(/[/\\]/).filter(Boolean).pop();
                      if (baseName) setValue("name", baseName);
                    }
                  },
                })}
                placeholder='e.g. C:/job-data or /var/jobs'
                className='w-full px-3 py-2 text-sm border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono text-xs pr-2'
              />
              <button
                type='button'
                onClick={() => setIsBrowserOpen(true)}
                className='inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold whitespace-nowrap transition cursor-pointer'
                title='Browse local folders'>
                📁 Browse...
              </button>
            </div>

            <input
              type='file'
              ref={fileInputRef}
              onChange={handleNativeFolderPicked}
              {...({
                webkitdirectory: "",
                directory: "",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
              className='hidden'
            />
          </div>

          <div className='md:col-span-3 flex items-center justify-between gap-2'>
            <label className='flex items-center text-sm text-gray-600 font-medium'>
              <input
                type='checkbox'
                {...register("recursive")}
                className='mr-2 rounded text-blue-600'
              />
              Recursive
            </label>
            <button
              type='submit'
              disabled={isSubmitting}
              className='bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition disabled:opacity-50 cursor-pointer'>
              {isSubmitting ? "Adding..." : "Add Folder"}
            </button>
          </div>
        </form>
      </div>

      {/* Directory Browser Modal */}
      <FolderBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelect={handleSelectPath}
        initialPath={currentPathValue}
      />

      {/* Monitored Folders List */}
      <FolderListTable
        folders={folders}
        refetch={refetch}
        onToggleStatus={toggleStatus}
        onDeleteFolder={deleteFolder}
      />
    </div>
  );
}
