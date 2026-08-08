import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Query,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ImpersonateDto } from './dto/impersonate.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { TwoFactorService } from './cloud-auth/two-factor.service';
import { TokenRevocationService } from './token-revocation.service';
import { TenantIsolationService } from '../rbac/tenant-isolation.service';
import { TosAcceptanceService } from '../tos/tos-acceptance.service';
import { AccountDeletionService } from '../deletion/account-deletion.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiTags('Auth')
@ApiBearerAuth()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly revocation: TokenRevocationService,
    private readonly tenantIsolation: TenantIsolationService,
    private readonly tosService: TosAcceptanceService,
    private readonly deletionService: AccountDeletionService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body?.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body?.email ?? '');
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Post('two-factor/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(@CurrentUser() user: { id: string; email: string }) {
    return this.twoFactorService.beginEnable(user.id, user.email);
  }

  @Post('two-factor/status')
  @HttpCode(HttpStatus.OK)
  async twoFactorStatus(@CurrentUser() user: { id: string }) {
    return this.twoFactorService.status(user.id);
  }

  @Post('two-factor/verify')
  @HttpCode(HttpStatus.OK)
  async verifyTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() body: { token: string },
  ) {
    return this.twoFactorService.verifyAndActivate(user.id, body.token);
  }

  @Post('two-factor/recovery-codes/regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(@CurrentUser() user: { id: string }) {
    return this.twoFactorService.regenerateRecoveryCodes(user.id);
  }

  @Post('two-factor/disable')
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() user: { id: string },
    @Body() body: { password?: string; recoveryCode?: string },
  ) {
    return this.twoFactorService.disableWithProof(user.id, body.password, body.recoveryCode);
  }

  /**
   * Logout — revoke exactly THIS token's jti so it's rejected by every service
   * on its next request (not just the auth service).
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: { jti?: string; exp?: number }) {
    return this.authService.logout(user?.jti, user?.exp);
  }

  /**
   * Admin-forced revoke of ALL outstanding sessions for a user.
   * SUPER_ADMIN or ADMIN only.
   */
  @Post('admin/users/:id/revoke-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminRevokeSessions(@Param('id') id: string) {
    return this.authService.revokeAllSessions(id);
  }

  /**
   * Issue a short-lived impersonation JWT for a target user.
   * SUPER_ADMIN can impersonate anyone; ADMIN can only impersonate users
   * within their own tenant. Audit log is written BEFORE the token is issued.
   */
  @Post('admin/users/:id/impersonate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async impersonate(
    @Param('id') id: string,
    @Body() dto: ImpersonateDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.authService.impersonate(
      user.id,
      user.role,
      id,
      dto.reason,
    );
  }

  /**
   * Token introspection — other microservices call this to check revocation
   * without needing direct Redis access. Returns { active } for the given
   * jti/sub/iat. Used by shared/token-revocation.ts.
   */
  @Public()
  @Post('introspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Introspect token' })
  @ApiResponse({ status: 200, description: 'Token introspection result' })
  async introspect(@Body() body: { jti?: string; sub: string; iat?: number }) {
    const revoked = await this.revocation.isTokenRevoked(body);
    return { active: !revoked };
  }

  @Post('reauth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async reauth(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: { password?: string; totpCode?: string },
  ) {
    return this.authService.reauth(user.id, dto.password, dto.totpCode);
  }

  @Post('impersonate/exit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async exitImpersonation(@CurrentUser() user: { id: string; impersonatedBy?: string }) {
    return this.authService.exitImpersonation(user.id, user.impersonatedBy ?? null);
  }

  @Patch('me/onboarding')
  @HttpCode(HttpStatus.OK)
  async updateOnboarding(
    @CurrentUser() user: { id: string },
    @Body() body: { step?: string; completed?: boolean; skipped?: boolean },
  ) {
    return this.authService.updateOnboarding(user.id, body);
  }

  @Patch('me/theme')
  @HttpCode(HttpStatus.OK)
  async updateTheme(
    @CurrentUser() user: { id: string },
    @Body() body: { themePreference: string },
  ) {
    return this.authService.updateTheme(user.id, body.themePreference);
  }

  private signState(payload: Record<string, string>) {
    const data = Buffer.from(JSON.stringify(payload)).toString('base64');
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret').update(data).digest('base64');
    return `${data}.${sig}`;
  }

  private verifyState(state: string): Record<string, string> {
    const [data, sig] = state.split('.');
    if (!data || !sig) throw new BadRequestException('Invalid state');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'fallback_secret').update(data).digest('base64');
    if (expected !== sig) throw new BadRequestException('Invalid state signature');
    try {
      return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid state payload');
    }
  }

  @Get('google')
  async googleAuthRedirect(@Query('context') context: string, @Query('inviteToken') inviteToken?: string) {
    const state = this.signState({ context: context || 'user_signup', inviteToken: inviteToken || '' });
    const base = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/google/callback`,
      response_type: 'code',
      scope: 'email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return { url: `${base}?${params.toString()}` };
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Query('state') state: string) {
    const verified = this.verifyState(state);
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/google/callback`,
      grant_type: 'authorization_code',
    });
    const accessToken = tokenRes.data.access_token;
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileRes.data;
    const result = await this.authService.upsertOAuthLogin({
      provider: 'google',
      providerAccountId: profile.sub,
      email: profile.email,
      name: profile.name,
      context: verified.context as any,
      inviteToken: verified.inviteToken || undefined,
    });
    return this.redirectToFrontend(result);
  }

  @Get('github')
  async githubAuthRedirect(@Query('context') context: string, @Query('inviteToken') inviteToken?: string) {
    const state = this.signState({ context: context || 'user_signup', inviteToken: inviteToken || '' });
    const base = 'https://github.com/login/oauth/authorize';
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || '',
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/github/callback`,
      scope: 'user:email',
      state,
    });
    return { url: `${base}?${params.toString()}` };
  }

  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Query('state') state: string) {
    const verified = this.verifyState(state);
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/github/callback`,
    }, { headers: { Accept: 'application/json' } });
    const accessToken = tokenRes.data.access_token;
    const profileRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileRes.data;
    const email = profile.email || (await axios.get('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })).data.find((e: any) => e.primary)?.email;
    if (!email) throw new BadRequestException('GitHub email not available');
    const result = await this.authService.upsertOAuthLogin({
      provider: 'github',
      providerAccountId: String(profileRes.data.id),
      email,
      name: profileRes.data.name || profileRes.data.login,
      context: verified.context as any,
      inviteToken: verified.inviteToken || undefined,
    });
    return this.redirectToFrontend(result);
  }

  @Get('gitea')
  async giteaAuthRedirect(@Query('context') context: string, @Query('inviteToken') inviteToken?: string) {
    const state = this.signState({ context: context || 'user_signup', inviteToken: inviteToken || '' });
    const base = `${process.env.GITEA_URL || 'http://gitea.voidcloud.svc.cluster.local:3000'}/login/oauth/authorize`;
    const params = new URLSearchParams({
      client_id: process.env.GITEA_CLIENT_ID || '',
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/gitea/callback`,
      scope: 'user:email',
      state,
    });
    return { url: `${base}?${params.toString()}` };
  }

  @Get('gitea/callback')
  async giteaCallback(@Query('code') code: string, @Query('state') state: string) {
    const verified = this.verifyState(state);
    const giteaUrl = process.env.GITEA_URL || 'http://gitea.voidcloud.svc.cluster.local:3000';
    const tokenRes = await axios.post(`${giteaUrl}/login/oauth/access_token`, {
      client_id: process.env.GITEA_CLIENT_ID,
      client_secret: process.env.GITEA_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/gitea/callback`,
      grant_type: 'authorization_code',
    }, { headers: { Accept: 'application/json' } });
    const accessToken = tokenRes.data.access_token;
    const profileRes = await axios.get(`${giteaUrl}/api/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileRes.data;
    const email = profile.email || profile.login;
    if (!email) throw new BadRequestException('Gitea email not available');
    const result = await this.authService.upsertOAuthLogin({
      provider: 'gitea',
      providerAccountId: String(profile.id),
      email,
      name: profile.full_name || profile.login,
      context: verified.context as any,
      inviteToken: verified.inviteToken || undefined,
    });
    return this.redirectToFrontend(result);
  }

  @Get('portainer')
  async portainerAuthRedirect(@Query('context') context: string, @Query('inviteToken') inviteToken?: string) {
    const state = this.signState({ context: context || 'user_signup', inviteToken: inviteToken || '' });
    const base = `${process.env.PORTAINER_URL || 'http://portainer.voidcloud.svc.cluster.local:9000'}/api/oauth/authorize`;
    const params = new URLSearchParams({
      client_id: process.env.PORTAINER_CLIENT_ID || '',
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/portainer/callback`,
      response_type: 'code',
      scope: 'openid profile email',
      state,
    });
    return { url: `${base}?${params.toString()}` };
  }

  @Get('portainer/callback')
  async portainerCallback(@Query('code') code: string, @Query('state') state: string) {
    const verified = this.verifyState(state);
    const portainerUrl = process.env.PORTAINER_URL || 'http://portainer.voidcloud.svc.cluster.local:9000';
    const tokenRes = await axios.post(`${portainerUrl}/api/oauth/token`, {
      client_id: process.env.PORTAINER_CLIENT_ID,
      client_secret: process.env.PORTAINER_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/portainer/callback`,
      grant_type: 'authorization_code',
    });
    const accessToken = tokenRes.data.access_token;
    const profileRes = await axios.get(`${portainerUrl}/api/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = profileRes.data;
    const email = profile.email;
    if (!email) throw new BadRequestException('Portainer email not available');
    const result = await this.authService.upsertOAuthLogin({
      provider: 'portainer',
      providerAccountId: String(profile.sub || profile.id),
      email,
      name: profile.name || email,
      context: verified.context as any,
      inviteToken: verified.inviteToken || undefined,
    });
    return this.redirectToFrontend(result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('oauth/providers')
  async oauthProviders(@CurrentUser() user: { id: string }) {
    return this.authService.linkedProviders(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('oauth/link')
  async oauthLink(@CurrentUser() user: { id: string }, @Body() body: { provider: string; code: string; state?: string }) {
    const profile = await this.fetchOAuthProfile(body.provider, body.code);
    await this.authService.linkOAuthIdentity(user.id, body.provider, profile.providerAccountId);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('oauth/unlink')
  async oauthUnlink(@CurrentUser() user: { id: string }, @Body() body: { provider: string }) {
    const linked = await this.authService.linkedProviders(user.id);
    if (linked.length <= 1) throw new BadRequestException('Cannot unlink the last auth method');
    await this.authService.unlinkOAuthIdentity(user.id, body.provider);
    return { ok: true };
  }

  private redirectToFrontend(result: { user: any; token: string }) {
    const frontend = (process.env.FRONTEND_URL || 'https://voidcloud.cc.cd').replace(/\/$/, '');
    let redirectRoute = '/voidcloud/dashboard';
    if (result.user.role === 'ADMIN') redirectRoute = '/voidcloud/admin/dashboard';
    if (result.user.role === 'AGENT') redirectRoute = '/voidcloud/dashboard';
    const url = `${frontend}${redirectRoute}?token=${result.token}&role=${result.user.role}`;
    return { redirect: url };
  }

  private async fetchOAuthProfile(provider: string, code: string) {
    if (provider === 'google') {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      });
      const accessToken = tokenRes.data.access_token;
      const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return { provider: 'google', providerAccountId: profileRes.data.sub, email: profileRes.data.email, name: profileRes.data.name };
    } else if (provider === 'github') {
      const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.BACKEND_URL || ''}/api/v1/auth/github/callback`,
      }, { headers: { Accept: 'application/json' } });
      const accessToken = tokenRes.data.access_token;
      const profileRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const email = profileRes.data.email || (await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })).data.find((e: any) => e.primary)?.email;
      return { provider: 'github', providerAccountId: String(profileRes.data.id), email, name: profileRes.data.name || profileRes.data.login };
    }
    throw new BadRequestException('Unsupported provider');
  }

  @Post('admin/team/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async inviteTeamMember(@CurrentUser() user: { id: string }, @Body('email') email: string) {
    return this.authService.inviteTeamMember(user.id, email);
  }

  @Get('admin/team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async listTeamMembers(@CurrentUser() user: { id: string; role: string }) {
    const tenantId = await this.tenantIsolation.getUserTenantId(user.id, user.role).catch(() => null);
    if (!tenantId) throw new ForbiddenException('No tenant found');
    return this.authService.listTeamMembers(tenantId);
  }

  @Post('admin/team/:userId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deactivateTeamMember(@CurrentUser() user: { id: string; role: string }, @Param('userId') targetUserId: string) {
    const tenantId = await this.tenantIsolation.getUserTenantId(user.id, user.role).catch(() => null);
    if (!tenantId) throw new ForbiddenException('No tenant found');
    return this.authService.deactivateTeamMember(tenantId, targetUserId, user.id);
  }

  @Get('admin/settings/business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getBusinessSettings(@CurrentUser() user: { id: string; role: string }) {
    const tenantId = await this.tenantIsolation.getUserTenantId(user.id, user.role).catch(() => null);
    if (!tenantId) throw new ForbiddenException('No tenant found');
    return this.authService.getBusinessSettings(tenantId);
  }

  @Patch('admin/settings/business')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateBusinessSettings(@CurrentUser() user: { id: string; role: string }, @Body() settings: Record<string, any>) {
    const tenantId = await this.tenantIsolation.getUserTenantId(user.id, user.role).catch(() => null);
    if (!tenantId) throw new ForbiddenException('No tenant found');
    return this.authService.updateBusinessSettings(tenantId, settings);
  }

  @Get('admin/api-keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async listApiKeys(@CurrentUser() user: { id: string }) {
    return this.authService.listApiKeys(user.id);
  }

  @Post('admin/api-keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async createApiKey(@CurrentUser() user: { id: string }, @Body('name') name: string) {
    return this.authService.generateApiKey(user.id, name);
  }

  @Delete('admin/api-keys/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteApiKey(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.authService.deleteApiKey(id, user.id);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  async listTenantApiKeys(@CurrentUser() user: { id: string }) {
    return this.authService.listTenantApiKeys(user.id);
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  async createTenantApiKey(@CurrentUser() user: { id: string }, @Body() body: { name: string; scopes?: string[] }) {
    return this.authService.createTenantApiKey(user.id, body.name, body.scopes || []);
  }

  @Post('api-keys/:id/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateApiKey(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.authService.regenerateApiKey(id, user.id);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  async deleteTenantApiKey(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.authService.deleteApiKey(id, user.id);
  }

  @Post('me/tos-accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record ToS and Privacy Policy acceptance' })
  async acceptToS(
    @CurrentUser() user: { id: string },
    @Body() body: { tosVersion: string; privacyVersion: string; ipAddress?: string; userAgent?: string },
  ) {
    return this.tosService.accept(user.id, body);
  }

  @Post('me/delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GDPR-style soft-delete current user account' })
  async deleteOwnAccount(
    @CurrentUser() user: { id: string; impersonatedBy?: string },
    @Body() body: { password: string },
  ) {
    return this.deletionService.deleteAccount(user.id, body.password, user);
  }

  @Post('admin/users/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force GDPR anonymize any user account — SUPER_ADMIN only' })
  async adminDeleteUser(
    @CurrentUser() user: { id: string; role: Role; impersonatedBy?: string },
    @Param('id') targetUserId: string,
    @Body() body: { reason: string },
  ) {
    return this.deletionService.adminDelete(user.id, targetUserId, body.reason, user);
  }

}
