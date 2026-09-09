import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { DataTransformerService } from './transformers/data-transformer.service';
import { MigrationRunnerService } from './migration-runner.service';
import { MigrationExecutionService } from './migration-execution.service';

@Module({
  imports: [PrismaModule],
  providers: [DataTransformerService, MigrationRunnerService, MigrationExecutionService],
  exports: [DataTransformerService, MigrationRunnerService, MigrationExecutionService],
})
export class MigrationModule {}
