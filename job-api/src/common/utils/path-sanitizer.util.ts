import * as path from 'node:path';
import * as fs from 'node:fs';

export class PathSanitizerUtil {
  public static sanitizeAndValidate(targetPath: string): {
    isValid: boolean;
    normalizedPath: string;
    error?: string;
  } {
    if (!targetPath || typeof targetPath !== 'string') {
      return { isValid: false, normalizedPath: '', error: 'Folder path is required.' };
    }

    const trimmed = targetPath.trim();
    if (trimmed.length === 0) {
      return { isValid: false, normalizedPath: '', error: 'Folder path cannot be empty.' };
    }

    // Resolve and normalize absolute path
    const normalized = path.normalize(path.resolve(trimmed));

    // Guard against dangerous directory traversal tokens in raw input
    if (trimmed.includes('..')) {
      return { isValid: false, normalizedPath: normalized, error: 'Directory traversal is forbidden.' };
    }

    // Verify existence on filesystem
    try {
      if (!fs.existsSync(normalized)) {
        return { isValid: false, normalizedPath: normalized, error: 'Specified folder path does not exist.' };
      }

      const stats = fs.statSync(normalized);
      if (!stats.isDirectory()) {
        return { isValid: false, normalizedPath: normalized, error: 'Specified path is not a directory.' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Filesystem access failed.';
      return { isValid: false, normalizedPath: normalized, error: message };
    }

    return { isValid: true, normalizedPath: normalized };
  }
}

