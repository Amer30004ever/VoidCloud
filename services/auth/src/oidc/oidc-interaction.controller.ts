import { Controller, Get, Post, Req, Res, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

/**
 * OIDC interaction controller.
 *
 * oidc-provider routes all interaction/consent through /oidc/interaction/:uid.
 * This controller bridges that flow with VoidCloud's existing user sessions so
 * the OIDC provider can resolve authenticated users without rebuilding login UI.
 */
@Controller('oidc/interaction')
@ApiTags('OIDC Interaction')
export class OidcInteractionController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':uid')
  @ApiOperation({ summary: 'OIDC interaction prompt — returns VoidCloud login page or confirms session' })
  @ApiResponse({ status: 200, description: 'Interaction page or session confirmation' })
  async getInteraction(@Req() req: Request, @Res() res: Response, @Param('uid') uid: string) {
    const session = req.cookies?.['voidcloud_session'];
    if (!session) {
      return res.redirect(`/voidcloud/login?oidc_uid=${uid}`);
    }

    try {
      const payload = this.jwtService.verify(session);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) {
        return res.redirect(`/voidcloud/login?oidc_uid=${uid}`);
      }

      const confirm = {
        login: {
          accountId: user.id,
          acr: '1',
          amr: ['pwd'],
          subject: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        consent: {
          rejected: false,
        },
      };

      const params = new URLSearchParams();
      params.set('then', `${req.originalUrl}/confirm`);
      params.set('state', JSON.stringify(confirm));

      return res.redirect(`/voidcloud/oidc/confirm?${params.toString()}`);
    } catch {
      return res.redirect(`/voidcloud/login?oidc_uid=${uid}`);
    }
  }

  @Public()
  @Post(':uid/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm OIDC interaction after VoidCloud login' })
  @ApiResponse({ status: 200, description: 'Interaction confirmed' })
  async confirmInteraction(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Not authenticated' });
    }

    const result = {
      login: {
        accountId: user.id,
        acr: '1',
        amr: ['pwd'],
        subject: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      consent: {
        rejected: false,
      },
    };

    return res.json(result);
  }
}
