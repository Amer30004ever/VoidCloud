import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AccountDeletionService } from './account-deletion.service';

interface RequestWithUser extends Request {
  user?: { id: string; role?: Role };
}

@ApiTags('Account Deletion')
@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountDeletionController {
  constructor(private readonly deletionService: AccountDeletionService) {}

  @Post('me/delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GDPR-style soft-delete current user account' })
  async deleteOwnAccount(
    @Req() req: RequestWithUser,
    @Body() body: { password: string },
  ) {
    return this.deletionService.deleteAccount(req.user!.id, body.password);
  }

  @Post('admin/users/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force delete (GDPR anonymize) any user account — SUPER_ADMIN only' })
  async adminDelete(
    @Req() req: RequestWithUser,
    @Param('id') targetUserId: string,
    @Body() body: { reason: string },
  ) {
    return this.deletionService.adminDelete(req.user!.id, targetUserId, body.reason);
  }
}
