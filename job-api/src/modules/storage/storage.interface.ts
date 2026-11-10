export interface IStorageService {
  read<T>(category: string, filename: string, fallback: T): Promise<T>;
  write<T>(category: string, filename: string, data: T): Promise<void>;
  exists(category: string, filename: string): boolean;
  getStoragePath(category: string, filename: string): string;
}

export type StorageCategory = 'configurations' | 'jobs' | 'processing' | 'notifications' | 'devices';

