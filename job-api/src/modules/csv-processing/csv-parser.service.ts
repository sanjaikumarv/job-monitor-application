import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse';
import * as fs from 'node:fs';

export interface ParsedCsvRow {
  lineNumber: number;
  data: Record<string, string>;
}

@Injectable()
export class CsvParserService {
  private readonly logger = new Logger(CsvParserService.name);

  public async parseCsvFile(filePath: string): Promise<ParsedCsvRow[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedCsvRow[] = [];
      let currentLine = 1; // 1-based line counting including header

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      });

      const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });

      parser.on('readable', () => {
        let record: Record<string, string> | null;
        while ((record = parser.read() as Record<string, string> | null) !== null) {
          currentLine++;
          results.push({
            lineNumber: currentLine,
            data: record,
          });
        }
      });

      parser.on('error', (err) => {
        this.logger.error(`CSV parsing error on file ${filePath}: ${err.message}`);
        reject(err);
      });

      parser.on('end', () => {
        resolve(results);
      });

      stream.pipe(parser);
    });
  }

  public async parseCsvString(csvContent: string): Promise<ParsedCsvRow[]> {
    return new Promise((resolve, reject) => {
      const results: ParsedCsvRow[] = [];
      let currentLine = 1;

      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      });

      parser.on('readable', () => {
        let record: Record<string, string> | null;
        while ((record = parser.read() as Record<string, string> | null) !== null) {
          currentLine++;
          results.push({
            lineNumber: currentLine,
            data: record,
          });
        }
      });

      parser.on('error', (err) => reject(err));
      parser.on('end', () => resolve(results));

      parser.write(csvContent);
      parser.end();
    });
  }
}

