import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';

import { DatabaseModule } from '../../database/database.module';
import { PhotosService } from './photos.service';
import { PhotosController } from './photos.controller';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      storage: undefined, // Use memory storage
    }),
  ],
  controllers: [PhotosController],
  providers: [PhotosService],
  exports: [PhotosService],
})
export class PhotosModule {}
