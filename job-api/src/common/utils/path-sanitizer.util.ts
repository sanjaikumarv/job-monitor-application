import * as path from 'node:path';
import * as fs from 'node:fs';

export class PathSanitizerUtil {
  public static resolveCrossPlatformPath(inputPath: string): string {
    const trimmed = inputPath.trim();
    if (fs.existsSync(trimmed)) {
      return path.normalize(path.resolve(trimmed));
    }

    // Resolve Windows host paths when running inside Linux / Docker container
    if (process.platform !== 'win32' && /^[a-zA-Z]:[\\/]/.test(trimmed)) {
      const parts = trimmed.split(/[\\/]/).filter(Boolean);
      const folderName = parts[parts.length - 1];

      if (fs.existsSync('/external-watch-folder')) {
        return '/external-watch-folder';
      }

      if (folderName) {
        const subMount = path.join('/monitored-folders', folderName);
        if (fs.existsSync(subMount)) {
          return subMount;
        }
      }

      if (fs.existsSync('/monitored-folders')) {
        return '/monitored-folders';
      }
    }

    return path.normalize(path.resolve(trimmed));
  }

  public static sanitizeAndValidate(targetPath: string): {
    isValid: boolean;
    normalizedPath: string;
    error?: string;
  } {
    if (!targetPath || typeof targetPath !== 'string') {
      return {
        isValid: false,
        normalizedPath: '',
        error: 'Folder path is required.',
      };
    }

    const trimmed = targetPath.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        normalizedPath: '',
        error: 'Folder path cannot be empty.',
      };
    }

    if (trimmed.includes('..')) {
      return {
        isValid: false,
        normalizedPath: path.normalize(path.resolve(trimmed)),
        error: 'Directory traversal is forbidden.',
      };
    }

    const resolved = this.resolveCrossPlatformPath(trimmed);

    try {
      if (!fs.existsSync(resolved)) {
        return {
          isValid: false,
          normalizedPath: resolved,
          error: 'Specified folder path does not exist.',
        };
      }

      const stats = fs.statSync(resolved);
      if (!stats.isDirectory()) {
        return {
          isValid: false,
          normalizedPath: resolved,
          error: 'Specified path is not a directory.',
        };
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Filesystem access failed.';
      return { isValid: false, normalizedPath: resolved, error: message };
    }

    return { isValid: true, normalizedPath: resolved };
  }
}
