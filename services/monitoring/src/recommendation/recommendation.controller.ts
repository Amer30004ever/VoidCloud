import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('monitoring')
@ApiTags('Recommendations')
@ApiBearerAuth()
export class RecommendationController {
  constructor(private readonly recommendation: RecommendationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.ADMIN, Role.SUPER_ADMIN)
  @Get('recommendations/vps/:vpsId')
  async listForVps(@Param('vpsId') vpsId: string) {
    return this.recommendation.listForVps(vpsId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @Get('recommendations')
  async listAll() {
    return this.recommendation.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('recommendations/:id/acknowledge')
  async acknowledge(@Param('id') id: string) {
    return this.recommendation.acknowledge(id);
  }
}
