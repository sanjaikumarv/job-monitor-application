import { Module } from '@nestjs/common';
import { FoldersController } from './folders.controller.js';
import { FoldersService } from './folders.service.js';
import { FolderWatcherService } from './folder-watcher.service.js';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, FolderWatcherService],
  exports: [FoldersService, FolderWatcherService],
})
export class FoldersModule {}

