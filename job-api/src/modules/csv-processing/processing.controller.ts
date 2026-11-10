import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { ProcessingHistoryItem } from '../../common/interfaces/processing.interface.js';
import { CsvProcessingService } from './csv-processing.service.js';

@Controller('api/processing')
export class ProcessingController {
  constructor(private readonly processingService: CsvProcessingService) {}

  @Get('history')
  public getHistory(): ProcessingHistoryItem[] {
    return this.processingService.getHistory();
  }

  @Get(':id')
  public getById(@Param('id') id: string): ProcessingHistoryItem {
    const item = this.processingService.getHistoryById(id);
    if (!item) {
      throw new NotFoundException(`Processing record "${id}" not found.`);
    }
    return item;
  }
}
