import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export const REDIS_KEYS = {
  OTP_CODE: (phone: string) => `otp:code:${phone}`,
  OTP_RATELIMIT: (phone: string) => `otp:ratelimit:${phone}`,
  OTP_ATTEMPTS: (phone: string) => `otp:attempts:${phone}`,
  CART_CACHE: (userId: string) => `cart:${userId}`,
};

export const REDIS_TTLS = {
  OTP_CODE: 900,        // 15 minutes
  OTP_RATELIMIT: 900,   // 15 minutes
  OTP_ATTEMPTS: 300,    // 5 minutes
  CART_CACHE: 1800,     // 30 minutes
};

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType | null = null;
  private isConnected = false;
  private hasWarnedFallback = false;
  private fallbackStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password', '');

    try {
      this.client = createClient({
        socket: {
          host,
          port,
          reconnectStrategy: false, // Prevents uncaught reconnection loops when Redis server is offline
        },
        password: password || undefined,
      }) as RedisClientType;

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis connected successfully [${host}:${port}]`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        if (!this.hasWarnedFallback) {
          this.hasWarnedFallback = true;
          this.logger.warn(`Redis server not available. Using high-availability in-memory fallback store.`);
        }
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        if (!this.hasWarnedFallback) {
          this.hasWarnedFallback = true;
          this.logger.warn(`Redis server not available. Using high-availability in-memory fallback store.`);
        }
      });
    } catch (err: any) {
      if (!this.hasWarnedFallback) {
        this.hasWarnedFallback = true;
        this.logger.warn(`Redis initialization skipped. Using in-memory fallback store.`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      await this.client.quit().catch(() => {});
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        const val = await this.client.get(key);
        if (typeof val === 'string') return val;
      } catch {
        // Fallback to in-memory store
      }
    }

    const entry = this.fallbackStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.fallbackStore.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<boolean> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.fallbackStore.set(key, { value, expiresAt });

    if (this.client && this.isConnected) {
      try {
        await this.client.set(key, value, { EX: ttlSeconds });
      } catch {
        // Fallback store is already updated
      }
    }
    return true;
  }

  async delete(key: string): Promise<boolean> {
    this.fallbackStore.delete(key);

    if (this.client && this.isConnected) {
      try {
        await this.client.del(key);
      } catch {
        // Fallback store is already updated
      }
    }
    return true;
  }

  async increment(key: string, ttlSeconds: number = 900): Promise<number | null> {
    if (this.client && this.isConnected) {
      try {
        const val = await this.client.incr(key);
        if (val === 1 && ttlSeconds) {
          await this.client.expire(key, ttlSeconds);
        }
        return val;
      } catch {
        // Fallback to in-memory store
      }
    }

    const entry = this.fallbackStore.get(key);
    let currentVal = 0;
    if (entry && Date.now() <= entry.expiresAt) {
      currentVal = parseInt(entry.value, 10) || 0;
    }
    const newVal = currentVal + 1;
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.fallbackStore.set(key, { value: String(newVal), expiresAt });
    return newVal;
  }
}
