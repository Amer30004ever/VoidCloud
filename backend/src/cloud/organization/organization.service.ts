import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrgRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MANAGE_ROLES: OrgRole[] = ['OWNER', 'ADMIN'];

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'org';
}

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  private async assertRole(orgId: string, userId: string, allowed: OrgRole[]) {
    const m = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this organization');
    if (!allowed.includes(m.role)) throw new ForbiddenException('Insufficient role');
    return m;
  }

  async create(userId: string, name: string) {
    if (!name?.trim()) throw new BadRequestException('Name required');
    const base = slugify(name);
    let slug = base;
    for (let i = 1; await this.prisma.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    return this.prisma.organization.create({
      data: {
        name: name.trim(), slug, ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
      include: { members: true },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { members: { where: { userId }, select: { role: true } }, _count: { select: { members: true, vps: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(orgId: string, userId: string) {
    await this.assertRole(orgId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
    return this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
        invitations: { where: { acceptedAt: null } },
        _count: { select: { vps: true } },
      },
    });
  }

  async update(orgId: string, userId: string, data: { name?: string; avatar?: string | null }) {
    await this.assertRole(orgId, userId, MANAGE_ROLES);
    const patch: Prisma.OrganizationUpdateInput = {};
    if (data.name?.trim()) patch.name = data.name.trim();
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    return this.prisma.organization.update({ where: { id: orgId }, data: patch });
  }

  async remove(orgId: string, userId: string) {
    const m = await this.assertRole(orgId, userId, ['OWNER']);
    if (m.role !== 'OWNER') throw new ForbiddenException();
    await this.prisma.organization.delete({ where: { id: orgId } });
    return { ok: true };
  }

  async listMembers(orgId: string, userId: string) {
    await this.assertRole(orgId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async invite(orgId: string, inviterId: string, email: string, role: OrgRole) {
    await this.assertRole(orgId, inviterId, MANAGE_ROLES);
    if (!email?.includes('@')) throw new BadRequestException('Invalid email');
    if (role === 'OWNER') throw new BadRequestException('Cannot invite as OWNER');
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);
    return this.prisma.organizationInvitation.upsert({
      where: { organizationId_email: { organizationId: orgId, email: email.toLowerCase() } },
      create: { organizationId: orgId, email: email.toLowerCase(), role, invitedBy: inviterId, expiresAt },
      update: { role, invitedBy: inviterId, expiresAt, acceptedAt: null },
    });
    // TODO: queue invitation email
  }

  async listMyInvitations(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return [];
    return this.prisma.organizationInvitation.findMany({
      where: { email: user.email.toLowerCase(), acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { organization: { select: { id: true, name: true, slug: true } } },
    });
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const inv = await this.prisma.organizationInvitation.findUnique({ where: { id: invitationId } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (inv.acceptedAt) throw new BadRequestException('Already accepted');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Invitation expired');
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) throw new ForbiddenException('Invitation is for a different email');
    await this.prisma.$transaction([
      this.prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: inv.organizationId, userId } },
        create: { organizationId: inv.organizationId, userId, role: inv.role },
        update: { role: inv.role },
      }),
      this.prisma.organizationInvitation.update({ where: { id: invitationId }, data: { acceptedAt: new Date() } }),
    ]);
    return { ok: true, organizationId: inv.organizationId };
  }

  async revokeInvitation(invitationId: string, userId: string) {
    const inv = await this.prisma.organizationInvitation.findUnique({ where: { id: invitationId } });
    if (!inv) throw new NotFoundException();
    await this.assertRole(inv.organizationId, userId, MANAGE_ROLES);
    await this.prisma.organizationInvitation.delete({ where: { id: invitationId } });
    return { ok: true };
  }

  async removeMember(orgId: string, adminId: string, memberId: string) {
    const me = await this.assertRole(orgId, adminId, MANAGE_ROLES);
    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: memberId } },
    });
    if (!target) throw new NotFoundException();
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');
    if (target.userId === me.userId) throw new BadRequestException('Use leave to remove yourself');
    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: memberId } },
    });
    return { ok: true };
  }

  async updateMemberRole(orgId: string, adminId: string, memberId: string, role: OrgRole) {
    await this.assertRole(orgId, adminId, ['OWNER']);
    if (role === 'OWNER') throw new BadRequestException('Use transfer-ownership flow');
    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: memberId } },
    });
    if (!target) throw new NotFoundException();
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot demote owner');
    return this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: memberId } },
      data: { role },
    });
  }

  async transferVps(vpsId: string, userId: string, organizationId: string | null) {
    const vps = await this.prisma.cloudDeployment.findUnique({ where: { id: vpsId } });
    if (!vps) throw new NotFoundException('VPS not found');
    if (vps.userId !== userId) throw new ForbiddenException();
    if (organizationId) await this.assertRole(organizationId, userId, MANAGE_ROLES);
    return this.prisma.cloudDeployment.update({ where: { id: vpsId }, data: { organizationId } });
  }
}
