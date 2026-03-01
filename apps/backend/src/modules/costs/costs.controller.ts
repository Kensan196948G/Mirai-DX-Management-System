import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { CostsService } from './costs.service';
import type { CreateCostBudgetDto, CreateCostActualDto, CostSummaryItem, OverallSummary } from './costs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { CostBudget, CostActual } from '@prisma/client';

@ApiTags('costs')
@Controller('projects/:projectId/costs')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Post('budgets')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN')
  @ApiOperation({ summary: 'Create a cost budget for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Budget created' })
  async createBudget(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<CreateCostBudgetDto, 'projectId' | 'createdBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CostBudget> {
    return this.costsService.createBudget({ ...dto, projectId, createdBy: user.userId! });
  }

  @Get('budgets')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN')
  @ApiOperation({ summary: 'Get cost budgets for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Budgets retrieved' })
  async findBudgets(@Param('projectId') projectId: string): Promise<CostBudget[]> {
    return this.costsService.findBudgetsByProject(projectId);
  }

  @Post('actuals')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN')
  @ApiOperation({ summary: 'Create a cost actual for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 201, description: 'Actual created' })
  async createActual(
    @Param('projectId') projectId: string,
    @Body() dto: Omit<CreateCostActualDto, 'projectId' | 'recordedBy'>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CostActual> {
    return this.costsService.createActual({ ...dto, projectId, recordedBy: user.userId! });
  }

  @Get('actuals')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN')
  @ApiOperation({ summary: 'Get cost actuals for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Actuals retrieved' })
  async findActuals(@Param('projectId') projectId: string): Promise<CostActual[]> {
    return this.costsService.findActualsByProject(projectId);
  }

  @Get('summary')
  @Roles('SYSTEM_ADMIN', 'BRANCH_ADMIN')
  @ApiOperation({ summary: 'Get cost summary (budget vs actual by category)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({ status: 200, description: 'Summary retrieved' })
  async getSummary(@Param('projectId') projectId: string): Promise<{
    summary: CostSummaryItem[];
    overall: OverallSummary;
  }> {
    const [summary, overall] = await Promise.all([
      this.costsService.getCostSummary(projectId),
      this.costsService.getOverallSummary(projectId),
    ]);
    return { summary, overall };
  }
}
