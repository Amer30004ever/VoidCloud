import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { VmImportService } from './vm-import.service';

@Controller('managed/vm-imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('VM Import')
@ApiBearerAuth()
export class VmImportController {
  constructor(private readonly imports: VmImportService) {}

  @Get('formats')
  formats() {
    return this.imports.formats();
  }

  @Get()
  @ApiOperation({ summary: 'List the caller VM import jobs' })
  list(@Req() req: any) {
    return this.imports.list(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Queue a bring-your-own-VM disk image import' })
  create(@Req() req: any, @Body() body: any) {
    return this.imports.create(req.user.id, body);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.imports.get(req.user.id, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.imports.cancel(req.user.id, id);
  }
}
