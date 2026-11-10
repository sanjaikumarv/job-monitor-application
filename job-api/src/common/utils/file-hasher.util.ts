import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export class FileHasherUtil {
  public static async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  public static computeCompositeJobId(
    company: string,
    title: string,
    url: string,
  ): string {
    const raw = `${company.trim().toLowerCase()}|${title.trim().toLowerCase()}|${url.trim().toLowerCase()}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
    return `JOB-${hash.toUpperCase()}`;
  }

  public static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

