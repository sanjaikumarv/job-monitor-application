import { Global, Module } from '@nestjs/common';
import { JsonStorageService } from './json-storage.service.js';

@Global()
@Module({
  providers: [JsonStorageService],
  exports: [JsonStorageService],
})
export class StorageModule {}

