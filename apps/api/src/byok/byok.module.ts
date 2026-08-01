import { Module } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { ByokController } from './byok.controller';
import { ByokService } from './byok.service';
import { EncryptionService } from './encryption.service';

@Module({
  controllers: [ByokController],
  providers: [ByokService, EncryptionService, PrismaService],
  exports: [ByokService, EncryptionService],
})
export class ByokModule {}
