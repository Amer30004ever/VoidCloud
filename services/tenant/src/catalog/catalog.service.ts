import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const CATEGORIES = [
  'cms',
  'database',
  'devtools',
  'analytics',
  'ecommerce',
  'communication',
  'security',
  'other',
];

/**
 * Tier 9 — Community app catalog.
 *
 * Users submit one-click app recipes (docker compose specs); Super Admins
 * moderate them. Only APPROVED apps are visible publicly.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  categories() {
    return CATEGORIES;
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  async submit(
    userId: string,
    authorName: string | undefined,
    input: {
      name: string;
      summary: string;
      description?: string;
      category?: string;
      iconUrl?: string;
      repoUrl?: string;
      composeSpec?: unknown;
    },
  ) {
    const name = (input.name || '').trim();
    if (name.length < 3) throw new BadRequestException('Name must be at least 3 characters');
    if (!input.summary?.trim()) throw new BadRequestException('A short summary is required');

    const category = (input.category || 'other').toLowerCase();
    if (!CATEGORIES.includes(category)) {
      throw new BadRequestException(`Unknown category. Allowed: ${CATEGORIES.join(', ')}`);
    }

    const slug = this.slugify(name);
    if (!SLUG_RE.test(slug)) throw new BadRequestException('Name produces an invalid slug');

    const clash = await this.prisma.catalogApp.findUnique({ where: { slug } });
    if (clash) throw new ConflictException('An app with a similar name already exists');

    return this.prisma.catalogApp.create({
      data: {
        slug,
        name,
        summary: input.summary.trim().slice(0, 280),
        description: input.description?.slice(0, 8000) ?? null,
        category,
        iconUrl: input.iconUrl ?? null,
        repoUrl: input.repoUrl ?? null,
        composeSpec: (input.composeSpec ?? null) as any,
        authorId: userId,
        authorName: authorName ?? null,
        status: 'PENDING_REVIEW',
      },
    });
  }

  /** Public listing — approved apps only. */
  async listPublic(filter: { category?: string; search?: string } = {}) {
    const rows = await this.prisma.catalogApp.findMany({
      where: {
        status: 'APPROVED',
        category: filter.category ? filter.category.toLowerCase() : undefined,
        ...(filter.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' as const } },
                { summary: { contains: filter.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ installCount: 'desc' }, { publishedAt: 'desc' }],
      take: 100,
    });
    return rows.map((app: any) => this.withRating(app));
  }

  async mySubmissions(userId: string) {
    return this.prisma.catalogApp.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pending() {
    return this.prisma.catalogApp.findMany({
      where: { status: 'PENDING_REVIEW' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async review(reviewerId: string, id: string, approve: boolean, notes?: string) {
    const app = await this.prisma.catalogApp.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('App not found');
    if (app.status === 'APPROVED' && approve) return app;

    return this.prisma.catalogApp.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewerId,
        reviewNotes: notes?.slice(0, 1000) ?? null,
        publishedAt: approve ? new Date() : null,
      },
    });
  }

  async getBySlug(slug: string) {
    const app = await this.prisma.catalogApp.findUnique({ where: { slug } });
    if (!app || app.status !== 'APPROVED') throw new NotFoundException('App not found');
    return this.withRating(app);
  }

  async recordInstall(slug: string) {
    const app = await this.prisma.catalogApp.findUnique({ where: { slug } });
    if (!app || app.status !== 'APPROVED') throw new NotFoundException('App not found');
    return this.prisma.catalogApp.update({
      where: { id: app.id },
      data: { installCount: { increment: 1 } },
    });
  }

  async rate(userId: string, slug: string, rating: number, comment?: string) {
    const value = Math.round(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    const app = await this.prisma.catalogApp.findUnique({ where: { slug } });
    if (!app || app.status !== 'APPROVED') throw new NotFoundException('App not found');
    if (app.authorId === userId) {
      throw new ForbiddenException('Authors cannot rate their own app');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.catalogAppReview.findUnique({
        where: { appId_userId: { appId: app.id, userId } },
      });
      if (existing) {
        await tx.catalogAppReview.update({
          where: { id: existing.id },
          data: { rating: value, comment: comment?.slice(0, 1000) ?? null },
        });
        await tx.catalogApp.update({
          where: { id: app.id },
          data: { ratingSum: { increment: value - existing.rating } },
        });
      } else {
        await tx.catalogAppReview.create({
          data: { appId: app.id, userId, rating: value, comment: comment?.slice(0, 1000) ?? null },
        });
        await tx.catalogApp.update({
          where: { id: app.id },
          data: { ratingSum: { increment: value }, ratingCount: { increment: 1 } },
        });
      }
      const updated = await tx.catalogApp.findUnique({ where: { id: app.id } });
      return this.withRating(updated);
    });
  }

  private withRating(app: any) {
    return {
      ...app,
      rating: app.ratingCount > 0 ? Math.round((app.ratingSum / app.ratingCount) * 10) / 10 : null,
    };
  }
}
