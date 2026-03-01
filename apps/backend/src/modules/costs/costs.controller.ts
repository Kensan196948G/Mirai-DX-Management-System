import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CostsService } from './costs.service';

// Phase2 実装予定 - スタブ
@ApiTags('costs')
@Controller('costs')
export class CostsController {
  constructor(_c: CostsService) { void _c; }
}
