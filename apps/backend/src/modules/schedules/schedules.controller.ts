import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SchedulesService } from './schedules.service';

// Phase2 実装予定 - スタブ
@ApiTags('schedules')
@Controller('schedules')
export class SchedulesController {
  constructor(_s: SchedulesService) { void _s; }
}
