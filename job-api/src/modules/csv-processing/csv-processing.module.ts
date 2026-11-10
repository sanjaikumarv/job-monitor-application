import { Module, forwardRef } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CsvNormalizerService } from './csv-normalizer.service.js';
import { CsvParserService } from './csv-parser.service.js';
import { CsvProcessingService } from './csv-processing.service.js';
import { CsvValidationService } from './csv-validation.service.js';
import { ProcessingController } from './processing.controller.js';

@Module({
  imports: [FoldersModule, JobsModule, forwardRef(() => NotificationsModule)],
  controllers: [ProcessingController],
  providers: [
    CsvParserService,
    CsvNormalizerService,
    CsvValidationService,
    CsvProcessingService,
  ],
  exports: [
    CsvParserService,
    CsvNormalizerService,
    CsvValidationService,
    CsvProcessingService,
  ],
})
export class CsvProcessingModule {}
