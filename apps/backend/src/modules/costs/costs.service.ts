import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CostBudget, CostActual } from '@prisma/client';
import { CostCategory } from '@prisma/client';

export interface CreateCostBudgetDto {
  projectId: string;
  category: CostCategory;
  subCategory?: string;
  budgetAmount: number;
  description?: string;
  createdBy: string;
}

export interface CreateCostActualDto {
  projectId: string;
  budgetId?: string;
  category: CostCategory;
  subCategory?: string;
  actualAmount: number;
  actualDate: Date;
  vendorName?: string;
  invoiceNumber?: string;
  description?: string;
  attachmentS3Key?: string;
  recordedBy: string;
}

export interface CostSummaryItem {
  category: CostCategory;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  varianceRate: number;
}

export interface OverallSummary {
  totalBudget: number;
  totalActual: number;
  progressRate: number;
}

@Injectable()
export class CostsService {
  private readonly logger = new Logger(CostsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createBudget(dto: CreateCostBudgetDto): Promise<CostBudget> {
    const budget = await this.prisma.costBudget.create({
      data: {
        projectId: dto.projectId,
        category: dto.category,
        subCategory: dto.subCategory ?? null,
        budgetAmount: dto.budgetAmount,
        description: dto.description ?? null,
        createdBy: dto.createdBy,
      },
    });
    this.logger.log(`CostBudget created: ${budget.id}`);
    return budget;
  }

  async findBudgetsByProject(projectId: string): Promise<CostBudget[]> {
    return this.prisma.costBudget.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createActual(dto: CreateCostActualDto): Promise<CostActual> {
    if (dto.budgetId) {
      const budget = await this.prisma.costBudget.findUnique({ where: { id: dto.budgetId } });
      if (!budget) throw new NotFoundException(`CostBudget not found: ${dto.budgetId}`);
    }
    const actual = await this.prisma.costActual.create({
      data: {
        projectId: dto.projectId,
        budgetId: dto.budgetId ?? null,
        category: dto.category,
        subCategory: dto.subCategory ?? null,
        actualAmount: dto.actualAmount,
        actualDate: dto.actualDate,
        vendorName: dto.vendorName ?? null,
        invoiceNumber: dto.invoiceNumber ?? null,
        description: dto.description ?? null,
        attachmentS3Key: dto.attachmentS3Key ?? null,
        recordedBy: dto.recordedBy,
      },
    });
    this.logger.log(`CostActual created: ${actual.id}`);
    return actual;
  }

  async findActualsByProject(projectId: string): Promise<CostActual[]> {
    return this.prisma.costActual.findMany({
      where: { projectId },
      orderBy: { actualDate: 'desc' },
    });
  }

  async getCostSummary(projectId: string): Promise<CostSummaryItem[]> {
    const budgets = await this.prisma.costBudget.groupBy({
      by: ['category'],
      where: { projectId },
      _sum: { budgetAmount: true },
    });

    const actuals = await this.prisma.costActual.groupBy({
      by: ['category'],
      where: { projectId },
      _sum: { actualAmount: true },
    });

    const allCategories = Object.values(CostCategory);
    return allCategories
      .map((category) => {
        const b = budgets.find((x) => x.category === category);
        const a = actuals.find((x) => x.category === category);
        const budgetAmount = Number(b?._sum.budgetAmount ?? 0);
        const actualAmount = Number(a?._sum.actualAmount ?? 0);
        const variance = budgetAmount - actualAmount;
        const varianceRate = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
        return { category, budgetAmount, actualAmount, variance, varianceRate };
      })
      .filter((item) => item.budgetAmount > 0 || item.actualAmount > 0);
  }

  async getOverallSummary(projectId: string): Promise<OverallSummary> {
    const budgetAgg = await this.prisma.costBudget.aggregate({
      where: { projectId },
      _sum: { budgetAmount: true },
    });
    const actualAgg = await this.prisma.costActual.aggregate({
      where: { projectId },
      _sum: { actualAmount: true },
    });

    const totalBudget = Number(budgetAgg._sum.budgetAmount ?? 0);
    const totalActual = Number(actualAgg._sum.actualAmount ?? 0);
    const progressRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return { totalBudget, totalActual, progressRate };
  }
}
