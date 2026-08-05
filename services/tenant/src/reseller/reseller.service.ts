import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;

/**
 * Tier 9 — White-label reseller program.
 *
 * A reseller owns a brand (logo, colour, domain, support email) and a markup
 * applied on top of platform list prices for their downstream customers.
 */
@Injectable()
export class ResellerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    input: {
      companyName: string;
      slug?: string;
      domain?: string;
      logoUrl?: string;
      primaryColor?: string;
      supportEmail?: string;
      markupPercent?: number;
      organizationId?: string;
    },
  ) {
    const companyName = (input.companyName || '').trim();
    if (companyName.length < 2) throw new BadRequestException('Company name is required');

    const slug = (input.slug || companyName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    if (!SLUG_RE.test(slug)) throw new BadRequestException('Invalid brand slug');

    const domain = input.domain?.trim().toLowerCase() || undefined;
    if (domain && !DOMAIN_RE.test(domain)) throw new BadRequestException('Invalid domain');

    const color = input.primaryColor || '#6366f1';
    if (!HEX_COLOR_RE.test(color)) throw new BadRequestException('Colour must be a #RRGGBB hex value');

    const markup = input.markupPercent ?? 20;
    if (markup < 0 || markup > 200) throw new BadRequestException('Markup must be 0-200%');

    const clash = await this.prisma.resellerBrand.findFirst({
      where: { OR: [{ slug }, ...(domain ? [{ domain }] : [])] },
    });
    if (clash) throw new ConflictException('Brand slug or domain already taken');

    return this.prisma.resellerBrand.create({
      data: {
        ownerId,
        organizationId: input.organizationId ?? null,
        slug,
        companyName,
        domain: domain ?? null,
        logoUrl: input.logoUrl ?? null,
        primaryColor: color,
        supportEmail: input.supportEmail ?? null,
        markupPercent: markup,
      },
    });
  }

  listMine(ownerId: string) {
    return this.prisma.resellerBrand.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.resellerBrand.findMany({ orderBy: { createdAt: 'desc' } });
  }

  /** Public brand lookup used by the storefront to theme itself. */
  async resolve(hostOrSlug: string) {
    const value = (hostOrSlug || '').trim().toLowerCase();
    const brand = await this.prisma.resellerBrand.findFirst({
      where: { active: true, OR: [{ domain: value }, { slug: value }] },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return {
      slug: brand.slug,
      companyName: brand.companyName,
      logoUrl: brand.logoUrl,
      primaryColor: brand.primaryColor,
      supportEmail: brand.supportEmail,
      domain: brand.domain,
    };
  }

  private async owned(ownerId: string, id: string) {
    const brand = await this.prisma.resellerBrand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Brand not found');
    if (brand.ownerId !== ownerId) throw new ForbiddenException('Not your brand');
    return brand;
  }

  async update(
    ownerId: string,
    id: string,
    patch: {
      companyName?: string;
      logoUrl?: string;
      primaryColor?: string;
      supportEmail?: string;
      markupPercent?: number;
      active?: boolean;
      domain?: string;
    },
  ) {
    const brand = await this.owned(ownerId, id);
    if (patch.primaryColor && !HEX_COLOR_RE.test(patch.primaryColor)) {
      throw new BadRequestException('Colour must be a #RRGGBB hex value');
    }
    if (patch.markupPercent !== undefined && (patch.markupPercent < 0 || patch.markupPercent > 200)) {
      throw new BadRequestException('Markup must be 0-200%');
    }
    const domain = patch.domain?.trim().toLowerCase();
    if (domain && !DOMAIN_RE.test(domain)) throw new BadRequestException('Invalid domain');

    return this.prisma.resellerBrand.update({
      where: { id: brand.id },
      data: {
        companyName: patch.companyName?.trim() || brand.companyName,
        logoUrl: patch.logoUrl ?? brand.logoUrl,
        primaryColor: patch.primaryColor ?? brand.primaryColor,
        supportEmail: patch.supportEmail ?? brand.supportEmail,
        markupPercent: patch.markupPercent ?? brand.markupPercent,
        active: patch.active ?? brand.active,
        domain: domain ?? brand.domain,
      },
    });
  }

  async remove(ownerId: string, id: string) {
    const brand = await this.owned(ownerId, id);
    await this.prisma.resellerBrand.delete({ where: { id: brand.id } });
    return { deleted: true, id: brand.id };
  }

  /** Apply the brand markup to a list price. */
  static applyMarkup(listPrice: number, markupPercent: number) {
    return Math.round(listPrice * (1 + markupPercent / 100) * 100) / 100;
  }

  async priceFor(slug: string, listPrice: number) {
    const brand = await this.prisma.resellerBrand.findUnique({ where: { slug } });
    if (!brand || !brand.active) throw new NotFoundException('Brand not found');
    return {
      listPrice,
      markupPercent: brand.markupPercent,
      resellerPrice: ResellerService.applyMarkup(listPrice, brand.markupPercent),
    };
  }
}
