import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { QueuesModule } from './modules/queues/queues.module.js';
import { FoldersModule } from './modules/folders/folders.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { CsvProcessingModule } from './modules/csv-processing/csv-processing.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { PushModule } from './modules/push/push.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StorageModule,
    QueuesModule,
    FoldersModule,
    JobsModule,
    CsvProcessingModule,
    EmailModule,
    PushModule,
    DevicesModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
