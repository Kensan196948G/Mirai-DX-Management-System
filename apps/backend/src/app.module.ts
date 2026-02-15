import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';
import * as winston from 'winston';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PhotosModule } from './modules/photos/photos.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { CostsModule } from './modules/costs/costs.module';
import { HealthModule } from './modules/health/health.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { authConfig } from './config/auth.config';
import { awsConfig } from './config/aws.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, awsConfig],
      envFilePath: ['.env.development', '.env'],
    }),

    // Winston Logger
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        level: configService.get<string>('LOG_LEVEL', 'info'),
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.splat(),
          winston.format.json(),
        ),
        defaultMeta: { service: 'cdcp-api' },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({
                  timestamp,
                  level,
                  message,
                  context,
                  trace,
                }: {
                  timestamp?: string;
                  level?: string;
                  message?: string;
                  context?: string;
                  trace?: string;
                }) => {
                  const ts = timestamp ?? '';
                  const ctx = context ?? 'App';
                  const lvl = level ?? '';
                  const msg = message ?? '';
                  const traceStr = trace ? `\n${trace}` : '';
                  return `${ts} [${ctx}] ${lvl}: ${msg}${traceStr}`;
                },
              ),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ],
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('API_RATE_LIMIT_TTL', 60000),
          limit: configService.get<number>('API_RATE_LIMIT_MAX', 60),
        },
      ],
    }),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    PhotosModule,
    SchedulesModule,
    CostsModule,
    HealthModule,
  ],
  providers: [
    // Global Guards (apply to all routes by default)
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RbacGuard,
    },
  ],
})
export class AppModule {}
