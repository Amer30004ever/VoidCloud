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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { ResellerService } from './reseller.service';

@Controller('reseller')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('White-label Reseller')
@ApiBearerAuth()
export class ResellerController {
  constructor(private readonly reseller: ResellerService) {}

  @Get('brands/resolve/:hostOrSlug')
  @Public()
  @ApiOperation({ summary: 'Public brand theme lookup by domain or slug' })
  resolve(@Param('hostOrSlug') hostOrSlug: string) {
    return this.reseller.resolve(hostOrSlug);
  }

  @Get('brands')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  list(@Req() req: any) {
    return req.user.role === Role.SUPER_ADMIN
      ? this.reseller.listAll()
      : this.reseller.listMine(req.user.id);
  }

  @Post('brands')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a white-label brand' })
  create(@Req() req: any, @Body() body: any) {
    return this.reseller.create(req.user.id, body);
  }

  @Patch('brands/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.reseller.update(req.user.id, id, body);
  }

  @Delete('brands/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.reseller.remove(req.user.id, id);
  }

  @Get('brands/:slug/price/:listPrice')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Preview a reseller price with markup applied' })
  price(@Param('slug') slug: string, @Param('listPrice') listPrice: string) {
    return this.reseller.priceFor(slug, Number(listPrice));
  }
}
