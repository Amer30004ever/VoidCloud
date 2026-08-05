import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Community App Catalog')
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  @Public()
  categories() {
    return this.catalog.categories();
  }

  @Get('apps')
  @Public()
  @ApiOperation({ summary: 'List approved community apps' })
  list(@Query('category') category?: string, @Query('search') search?: string) {
    return this.catalog.listPublic({ category, search });
  }

  @Get('apps/:slug')
  @Public()
  get(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }

  @Post('apps')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit a community app for review' })
  submit(@Req() req: any, @Body() body: any) {
    return this.catalog.submit(req.user.id, req.user.name, body);
  }

  @Get('submissions/mine')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  mine(@Req() req: any) {
    return this.catalog.mySubmissions(req.user.id);
  }

  @Get('submissions/pending')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Moderation queue' })
  pending() {
    return this.catalog.pending();
  }

  @Post('submissions/:id/review')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a submission' })
  review(@Req() req: any, @Param('id') id: string, @Body() body: { approve: boolean; notes?: string }) {
    return this.catalog.review(req.user.id, id, Boolean(body?.approve), body?.notes);
  }

  @Post('apps/:slug/install')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  install(@Param('slug') slug: string) {
    return this.catalog.recordInstall(slug);
  }

  @Post('apps/:slug/rate')
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  rate(@Req() req: any, @Param('slug') slug: string, @Body() body: { rating: number; comment?: string }) {
    return this.catalog.rate(req.user.id, slug, body.rating, body.comment);
  }
}
