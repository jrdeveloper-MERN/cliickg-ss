import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('PrismaService connected to PostgreSQL database successfully.');
    } catch (error) {
      this.logger.warn(`PrismaService database connection deferred / skipped: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected cleanly.');
  }

  /**
   * Concurrency-safe, atomic database counter increment for sequential identifiers.
   * Utilizes PostgreSQL atomic row-level increment on InvoiceCounter without race conditions.
   */
  async getNextSequence(name: string, defaultStart = 1): Promise<number> {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const randomHex = Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(16, '0');
    const id = `${timestamp}${randomHex}`;

    const record = await this.invoiceCounter.upsert({
      where: { name },
      update: { seq: { increment: 1 } },
      create: {
        id,
        name,
        seq: defaultStart,
        year: new Date().getFullYear(),
      },
    });
    return record.seq;
  }
}

