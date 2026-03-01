import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Schedule } from '@prisma/client';

export interface CreateScheduleDto {
  projectId: string;
  parentId?: string;
  name: string;
  code?: string;
  level?: number;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progressRate?: number;
  isCriticalPath?: boolean;
  sortOrder?: number;
}

export interface UpdateScheduleDto {
  name?: string;
  code?: string;
  level?: number;
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  progressRate?: number;
  isCriticalPath?: boolean;
  sortOrder?: number;
  parentId?: string;
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScheduleDto): Promise<Schedule> {
    const schedule = await this.prisma.schedule.create({
      data: {
        projectId: dto.projectId,
        parentId: dto.parentId ?? null,
        name: dto.name,
        code: dto.code ?? null,
        level: dto.level ?? 1,
        startDate: dto.startDate,
        endDate: dto.endDate,
        actualStartDate: dto.actualStartDate ?? null,
        actualEndDate: dto.actualEndDate ?? null,
        progressRate: dto.progressRate ?? 0,
        isCriticalPath: dto.isCriticalPath ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    this.logger.log(`Schedule created: ${schedule.id}`);
    return schedule;
  }

  async findByProject(projectId: string): Promise<Schedule[]> {
    return this.prisma.schedule.findMany({
      where: { projectId },
      include: { children: true },
      orderBy: [{ sortOrder: 'asc' }, { startDate: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
      include: { children: true, progresses: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Schedule not found: ${id}`);
    }
    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto): Promise<Schedule> {
    await this.findOne(id);
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        level: dto.level,
        startDate: dto.startDate,
        endDate: dto.endDate,
        actualStartDate: dto.actualStartDate,
        actualEndDate: dto.actualEndDate,
        progressRate: dto.progressRate,
        isCriticalPath: dto.isCriticalPath,
        sortOrder: dto.sortOrder,
        parentId: dto.parentId,
      },
    });
    this.logger.log(`Schedule updated: ${id}`);
    return schedule;
  }

  async updateProgress(id: string, progress: number): Promise<Schedule> {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }
    await this.findOne(id);
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { progressRate: progress },
    });
    this.logger.log(`Schedule progress updated: ${id} -> ${progress}%`);
    return schedule;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.schedule.delete({ where: { id } });
    this.logger.log(`Schedule deleted: ${id}`);
  }
}
