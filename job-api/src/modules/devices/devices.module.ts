import { Module, forwardRef } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';

@Module({
  imports: [forwardRef(() => PushModule)],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
