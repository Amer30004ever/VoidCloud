import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NoteInput {
  title: string;
  content?: string;
  tags?: string;
  pinned?: boolean;
}

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, search?: string) {
    return this.prisma.note.findMany({
      where: {
        userId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { tags: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  get(userId: string, id: string) {
    return this.prisma.note.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: NoteInput) {
    return this.prisma.note.create({
      data: {
        title: data.title,
        content: data.content ?? '',
        tags: data.tags,
        pinned: data.pinned ?? false,
        userId,
      },
    });
  }

  async update(userId: string, id: string, data: Partial<NoteInput>) {
    await this.ensureOwned(userId, id);
    return this.prisma.note.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    return this.prisma.note.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const found = await this.prisma.note.findFirst({ where: { id, userId } });
    if (!found) throw new Error('Note not found');
    return found;
  }
}
