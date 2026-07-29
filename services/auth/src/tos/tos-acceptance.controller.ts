import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TosAcceptanceService } from './tos-acceptance.service';

interface RequestWithUser extends Request {
  user?: { id: string };
}

@ApiTags('ToS & Privacy')
@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TosAcceptanceController {
  constructor(private readonly tosService: TosAcceptanceService) {}

  @Post('me/tos-accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record ToS and Privacy Policy acceptance' })
  async accept(
    @Req() req: RequestWithUser,
    @Body() body: { tosVersion: string; privacyVersion: string; ipAddress?: string; userAgent?: string },
  ) {
    return this.tosService.accept(req.user!.id, body);
  }
}
