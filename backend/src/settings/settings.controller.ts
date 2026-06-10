import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SettingsService } from './settings.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/create-user.dto';

@ApiTags('Settings')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  async getUsers() {
    return this.settingsService.getUsers();
  }

  @Post('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user with password options' })
  async createUser(@Body() dto: CreateUserDto, @CurrentUser() user: { id: string }) {
    return this.settingsService.createUser(dto, user.id);
  }

  @Get('users/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    return this.settingsService.getUser(id);
  }

  @Put('users/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.settingsService.updateUser(id, dto, user.id);
  }

  @Post('users/:id/reset-password')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reset user password' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.settingsService.resetUserPassword(id, dto, user.id);
  }

  @Post('users/change-password')
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: { id: string }) {
    return this.settingsService.changePassword(user.id, dto);
  }

  @Delete('users/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.settingsService.deleteUser(id, user.id);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all roles' })
  async getRoles() {
    return this.settingsService.getRoles();
  }

  @Post('roles')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create role' })
  async createRole(@Body() roleData: { name: string; description: string; permissions: string[] }) {
    return this.settingsService.createRole(roleData);
  }

  @Put('roles/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update role' })
  async updateRole(@Param('id') id: string, @Body() roleData: Record<string, unknown>) {
    return this.settingsService.updateRole(id, roleData);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get API keys' })
  async getApiKeys(@Query('userId') userId?: string) {
    return this.settingsService.getApiKeys(userId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Generate API key' })
  async generateApiKey(@Body() keyData: { name: string; userId: string; expiresAt?: string }) {
    return this.settingsService.generateApiKey(keyData);
  }

  @Delete('api-keys/:id')
  @ApiOperation({ summary: 'Delete API key' })
  async deleteApiKey(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.settingsService.deleteApiKey(id, user.id);
  }

  @Get('audit-logs')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.settingsService.getAuditLogs(limit ? parseInt(limit) : undefined);
  }

  @Get('notifications/:userId')
  @ApiOperation({ summary: 'Get notification settings' })
  async getNotificationSettings(@Param('userId') userId: string) {
    return this.settingsService.getNotificationSettings(userId);
  }

  @Put('notifications/:userId')
  @ApiOperation({ summary: 'Update notification settings' })
  async updateNotificationSettings(@Param('userId') userId: string, @Body() settings: unknown) {
    return this.settingsService.updateNotificationSettings(userId, settings);
  }

  @Get('theme/:userId')
  @ApiOperation({ summary: 'Get theme settings' })
  async getThemeSettings(@Param('userId') userId: string) {
    return this.settingsService.getThemeSettings(userId);
  }

  @Put('theme/:userId')
  @ApiOperation({ summary: 'Update theme settings' })
  async updateThemeSettings(@Param('userId') userId: string, @Body() settings: unknown) {
    return this.settingsService.updateThemeSettings(userId, settings);
  }

  @Post('backup')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create backup' })
  async createBackup() {
    return this.settingsService.createBackup();
  }

  @Get('backups')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get backups' })
  async getBackups() {
    return this.settingsService.getBackups();
  }

  @Post('backup/:id/restore')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Restore backup' })
  async restoreBackup(@Param('id') backupId: string) {
    return this.settingsService.restoreBackup(backupId);
  }
}
