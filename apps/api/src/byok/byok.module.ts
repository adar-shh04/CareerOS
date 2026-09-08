import { Module } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { AiCapabilityService } from './ai-capability.service';
import { ByokController } from './byok.controller';
import { ByokService } from './byok.service';
import { EncryptionService } from './encryption.service';

@Module({
  controllers: [ByokController],
  providers: [
    ByokService,
    EncryptionService,
    AiCapabilityService,
    PrismaService,
  ],
  exports: [ByokService, EncryptionService, AiCapabilityService],
})
export class ByokModule {}
