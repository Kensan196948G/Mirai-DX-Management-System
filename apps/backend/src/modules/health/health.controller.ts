import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

import type { HealthCheckResult, HealthIndicatorFunction } from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memoryHealth: MemoryHealthIndicator,
    private readonly diskHealth: DiskHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthCheckResult> {
    return await this.health.check([
      // Database health
      (): ReturnType<HealthIndicatorFunction> =>
        this.prismaHealth.pingCheck('database', this.prisma),

      // Memory health (heap should not exceed 300MB)
      (): ReturnType<HealthIndicatorFunction> =>
        this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Memory health (RSS should not exceed 300MB)
      (): ReturnType<HealthIndicatorFunction> =>
        this.memoryHealth.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Disk health (storage should not exceed 90%)
      (): ReturnType<HealthIndicatorFunction> =>
        this.diskHealth.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(): Promise<HealthCheckResult> {
    return await this.health.check([
      // Only check database connectivity for readiness
      (): ReturnType<HealthIndicatorFunction> =>
        this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLive(): { status: string } {
    return { status: 'ok' };
  }
}
