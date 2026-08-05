import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ObjectStorageService } from './object-storage.service';

@Controller('managed/object-storage')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Object Storage')
@ApiBearerAuth()
export class ObjectStorageController {
  constructor(private readonly storage: ObjectStorageService) {}

  @Get('buckets')
  @ApiOperation({ summary: 'List the caller buckets with usage' })
  list(@Req() req: any) {
    return this.storage.listBuckets(req.user.id);
  }

  @Post('buckets')
  @ApiOperation({ summary: 'Create an S3-compatible bucket' })
  create(
    @Req() req: any,
    @Body()
    body: { name: string; region?: string; publicRead?: boolean; versioning?: boolean; quotaGb?: number },
  ) {
    return this.storage.createBucket(req.user.id, body);
  }

  @Patch('buckets/:id')
  @ApiOperation({ summary: 'Update bucket settings' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { publicRead?: boolean; versioning?: boolean; quotaGb?: number },
  ) {
    return this.storage.updateBucket(req.user.id, id, body);
  }

  @Delete('buckets/:id')
  @ApiOperation({ summary: 'Delete an empty bucket' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.storage.deleteBucket(req.user.id, id);
  }

  @Post('buckets/:id/keys')
  @ApiOperation({ summary: 'Issue a scoped access key (secret shown once)' })
  createKey(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { label?: string; readOnly?: boolean },
  ) {
    return this.storage.createKey(req.user.id, id, body?.label ?? 'default', body?.readOnly ?? false);
  }

  @Delete('keys/:keyId')
  @ApiOperation({ summary: 'Revoke an access key' })
  revokeKey(@Req() req: any, @Param('keyId') keyId: string) {
    return this.storage.revokeKey(req.user.id, keyId);
  }

  @Post('buckets/:id/presign')
  @ApiOperation({ summary: 'Presign a time-limited GET URL for an object' })
  presign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { objectKey: string; ttlSeconds?: number },
  ) {
    return this.storage.presignGet(req.user.id, id, body.objectKey, body.ttlSeconds);
  }
}
