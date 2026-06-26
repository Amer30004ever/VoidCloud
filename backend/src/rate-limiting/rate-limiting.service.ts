import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RateLimitConfig {
  maxMessagesPerMonth: number;
  maxMessagesPerDay: number;
  maxMessagesPerHour: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly defaultConfig: RateLimitConfig = {
    maxMessagesPerMonth: 10000,
    maxMessagesPerDay: 1000,
    maxMessagesPerHour: 100,
  };

  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  constructor(private prisma: PrismaService) {}

  /**
   * Check if a tenant can send a WhatsApp message
   */
  async canSendMessage(tenantId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
    const now = Date.now();
    const cacheKey = `tenant:${tenantId}`;
    
    // Get current usage from cache or database
    let usage = this.rateLimitCache.get(cacheKey);
    
    if (!usage || usage.resetTime < now) {
      // Reset counter for new hour
      usage = { count: 0, resetTime: now + 3600000 }; // 1 hour
      this.rateLimitCache.set(cacheKey, usage);
    }

    // Check hourly limit
    if (usage.count >= this.defaultConfig.maxMessagesPerHour) {
      return {
        allowed: false,
        reason: 'Hourly rate limit exceeded',
        remaining: 0,
      };
    }

    // Check daily limit (from database)
    const dailyUsage = await this.getDailyUsage(tenantId);
    if (dailyUsage >= this.defaultConfig.maxMessagesPerDay) {
      return {
        allowed: false,
        reason: 'Daily rate limit exceeded',
        remaining: 0,
      };
    }

    // Check monthly limit (from database)
    const monthlyUsage = await this.getMonthlyUsage(tenantId);
    if (monthlyUsage >= this.defaultConfig.maxMessagesPerMonth) {
      return {
        allowed: false,
        reason: 'Monthly rate limit exceeded',
        remaining: 0,
      };
    }

    // Increment counter
    usage.count++;
    this.rateLimitCache.set(cacheKey, usage);

    // Log usage to database
    await this.logUsage(tenantId);

    const remaining = Math.min(
      this.defaultConfig.maxMessagesPerHour - usage.count,
      this.defaultConfig.maxMessagesPerDay - dailyUsage - 1,
      this.defaultConfig.maxMessagesPerMonth - monthlyUsage - 1,
    );

    return { allowed: true, remaining };
  }

  /**
   * Get daily message count for a tenant
   */
  private async getDailyUsage(tenantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.prisma.message.count({
      where: {
        conversation: {
          tenantId,
        },
        direction: 'OUTBOUND',
        createdAt: {
          gte: startOfDay,
        },
      },
    });

    return count;
  }

  /**
   * Get monthly message count for a tenant
   */
  private async getMonthlyUsage(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const count = await this.prisma.message.count({
      where: {
        conversation: {
          tenantId,
        },
        direction: 'OUTBOUND',
        createdAt: {
          gte: startOfMonth,
        },
      },
    });

    return count;
  }

  /**
   * Log message usage for rate limiting
   */
  private async logUsage(tenantId: string): Promise<void> {
    try {
      // This could be expanded to store detailed usage metrics
      // For now, we rely on the Message table for tracking
    } catch (error) {
      this.logger.error(`Failed to log usage: ${error.message}`);
    }
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(tenantId: string) {
    const [daily, monthly] = await Promise.all([
      this.getDailyUsage(tenantId),
      this.getMonthlyUsage(tenantId),
    ]);

    return {
      daily: {
        used: daily,
        limit: this.defaultConfig.maxMessagesPerDay,
        remaining: this.defaultConfig.maxMessagesPerDay - daily,
      },
      monthly: {
        used: monthly,
        limit: this.defaultConfig.maxMessagesPerMonth,
        remaining: this.defaultConfig.maxMessagesPerMonth - monthly,
      },
    };
  }

  /**
   * Check if approaching rate limits and send alert
   */
  async checkAndAlert(tenantId: string): Promise<void> {
    const stats = await this.getUsageStats(tenantId);
    
    const dailyPercentage = (stats.daily.used / stats.daily.limit) * 100;
    const monthlyPercentage = (stats.monthly.used / stats.monthly.limit) * 100;

    if (dailyPercentage >= 80) {
      this.logger.warn(
        `Tenant ${tenantId} approaching daily rate limit: ${dailyPercentage.toFixed(1)}% used`,
      );
      // Could trigger notification here
    }

    if (monthlyPercentage >= 80) {
      this.logger.warn(
        `Tenant ${tenantId} approaching monthly rate limit: ${monthlyPercentage.toFixed(1)}% used`,
      );
      // Could trigger notification here
    }
  }

  /**
   * Reset rate limit cache (for testing or manual reset)
   */
  resetCache(tenantId?: string): void {
    if (tenantId) {
      this.rateLimitCache.delete(`tenant:${tenantId}`);
    } else {
      this.rateLimitCache.clear();
    }
  }
}
