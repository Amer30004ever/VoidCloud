import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { VpsService } from './vps.service';
import { CreateVpsDto, UpdateVpsDto } from './dto/vps.dto';

@Controller('vps')
@UseGuards(JwtAuthGuard)
export class VpsController {
  constructor(private readonly vpsService: VpsService) {}

  @Get()
  list(@CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateVpsDto, @CurrentUser() user: { id: string }) {
    return this.vpsService.create(dto, user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.get(id, user);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVpsDto,
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.update(id, dto, user);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.start(id, user);
  }

  @Post(':id/stop')
  stop(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.stop(id, user);
  }

  @Post(':id/restart')
  restart(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.restart(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.remove(id, user);
  }

  @Get(':id/status')
  status(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.status(id, user);
  }

  @Post(':id/snapshot')
  snapshot(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.snapshot(id, user);
  }

  @Get(':id/backups')
  backups(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.backups(id, user);
  }

  @Put(':id/resources')
  resize(
    @Param('id') id: string,
    @Body() body: { cpu?: number; memory?: number; storage?: number },
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.resize(id, body, user);
  }

  @Get(':id/console')
  console(@Param('id') id: string, @CurrentUser() user: { id: string; role: never }) {
    return this.vpsService.console(id, user);
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: { id: string; role: never },
  ) {
    return this.vpsService.clone(id, body.name, user);
  }
}
