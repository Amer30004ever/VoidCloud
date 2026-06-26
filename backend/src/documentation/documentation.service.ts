import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDocuments(category?: string, tag?: string) {
    try {
      const where: any = {};

      if (category) {
        where.category = { name: category };
      }

      if (tag) {
        where.tags = { some: { name: tag } };
      }

      const documents = await this.prisma.document.findMany({
        where,
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return { documents };
    } catch (error) {
      this.logger.error(`Error fetching documents: ${error.message}`);
      throw error;
    }
  }

  async getDocument(id: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return { document };
    } catch (error) {
      this.logger.error(`Error fetching document: ${error.message}`);
      throw error;
    }
  }

  async createDocument(documentData: any) {
    try {
      const { title, content, categoryId, tags, authorId } = documentData;

      const document = await this.prisma.document.create({
        data: {
          title,
          content,
          categoryId,
          authorId,
          tags: {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Create initial version
      await this.prisma.documentVersion.create({
        data: {
          documentId: document.id,
          content,
          versionNumber: 1,
          createdBy: authorId,
        },
      });

      this.logger.log(`Created document: ${title}`);
      return { document };
    } catch (error) {
      this.logger.error(`Error creating document: ${error.message}`);
      throw error;
    }
  }

  async updateDocument(id: string, documentData: any) {
    try {
      const { title, content, categoryId, tags, authorId } = documentData;

      const document = await this.prisma.document.update({
        where: { id },
        data: {
          title,
          content,
          categoryId,
          tags: {
            set: [],
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      // Get current version number
      const lastVersion = await this.prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { versionNumber: 'desc' },
      });

      // Create new version
      await this.prisma.documentVersion.create({
        data: {
          documentId: id,
          content,
          versionNumber: (lastVersion?.versionNumber || 0) + 1,
          createdBy: authorId,
        },
      });

      this.logger.log(`Updated document: ${title}`);
      return { document };
    } catch (error) {
      this.logger.error(`Error updating document: ${error.message}`);
      throw error;
    }
  }

  async deleteDocument(id: string) {
    try {
      await this.prisma.document.delete({
        where: { id },
      });

      this.logger.log(`Deleted document: ${id}`);
      return { success: true, message: 'Document deleted' };
    } catch (error) {
      this.logger.error(`Error deleting document: ${error.message}`);
      throw error;
    }
  }

  async getDocumentVersions(id: string) {
    try {
      const versions = await this.prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { versionNumber: 'desc' },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return { versions };
    } catch (error) {
      this.logger.error(`Error fetching document versions: ${error.message}`);
      throw error;
    }
  }

  async getDocumentVersion(id: string, versionId: string) {
    try {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!version || version.documentId !== id) {
        throw new Error('Document version not found');
      }

      return { version };
    } catch (error) {
      this.logger.error(`Error fetching document version: ${error.message}`);
      throw error;
    }
  }

  async restoreDocumentVersion(id: string, versionId: string) {
    try {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId },
      });

      if (!version || version.documentId !== id) {
        throw new Error('Document version not found');
      }

      const document = await this.prisma.document.update({
        where: { id },
        data: {
          content: version.content,
        },
      });

      // Create new version for the restore action
      const lastVersion = await this.prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { versionNumber: 'desc' },
      });

      await this.prisma.documentVersion.create({
        data: {
          documentId: id,
          content: version.content,
          versionNumber: (lastVersion?.versionNumber || 0) + 1,
          createdBy: document.authorId,
          isRestore: true,
          restoredFromVersionId: versionId,
        },
      });

      this.logger.log(`Restored document ${id} to version ${versionId}`);
      return { document };
    } catch (error) {
      this.logger.error(`Error restoring document version: ${error.message}`);
      throw error;
    }
  }

  async uploadDocument(file: any, metadata: any) {
    try {
      // This would integrate with a file storage service (S3, MinIO, etc.)
      // For now, we'll store the file content in the database
      const { title, categoryId, tags, authorId } = metadata;

      const document = await this.prisma.document.create({
        data: {
          title,
          content: file.buffer.toString('base64'),
          categoryId,
          authorId,
          fileType: file.mimetype,
          fileName: file.originalname,
          fileSize: file.size,
          tags: {
            connectOrCreate: tags.map((tag: string) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          },
        },
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Uploaded document: ${title}`);
      return { document };
    } catch (error) {
      this.logger.error(`Error uploading document: ${error.message}`);
      throw error;
    }
  }

  async downloadDocument(id: string) {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return {
        fileName: document.fileName || `${document.title}.md`,
        contentType: document.fileType || 'text/markdown',
        content: document.content,
      };
    } catch (error) {
      this.logger.error(`Error downloading document: ${error.message}`);
      throw error;
    }
  }

  async getCategories() {
    try {
      const categories = await this.prisma.documentCategory.findMany({
        include: {
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return { categories };
    } catch (error) {
      this.logger.error(`Error fetching categories: ${error.message}`);
      throw error;
    }
  }

  async createCategory(categoryData: any) {
    try {
      const category = await this.prisma.documentCategory.create({
        data: {
          name: categoryData.name,
          description: categoryData.description,
        },
      });

      this.logger.log(`Created category: ${categoryData.name}`);
      return { category };
    } catch (error) {
      this.logger.error(`Error creating category: ${error.message}`);
      throw error;
    }
  }

  async getTags() {
    try {
      const tags = await this.prisma.documentTag.findMany({
        include: {
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      return { tags };
    } catch (error) {
      this.logger.error(`Error fetching tags: ${error.message}`);
      throw error;
    }
  }

  async searchDocuments(searchData: {
    query: string;
    category?: string;
    tags?: string[];
  }) {
    try {
      const { query, category, tags } = searchData;

      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      };

      if (category) {
        where.category = { name: category };
      }

      if (tags && tags.length > 0) {
        where.tags = { some: { name: { in: tags } } };
      }

      const documents = await this.prisma.document.findMany({
        where,
        include: {
          category: true,
          tags: true,
          author: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return { documents };
    } catch (error) {
      this.logger.error(`Error searching documents: ${error.message}`);
      throw error;
    }
  }

  async exportDocument(id: string, format: 'pdf' | 'html' | 'markdown') {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // This would integrate with a document conversion service
      // For now, return the content as-is
      this.logger.log(`Exporting document ${id} to ${format}`);

      return {
        format,
        content: document.content,
        fileName: `${document.title}.${format === 'markdown' ? 'md' : format}`,
      };
    } catch (error) {
      this.logger.error(`Error exporting document: ${error.message}`);
      throw error;
    }
  }

  async getCollaborators(id: string) {
    try {
      const collaborators = await this.prisma.documentCollaborator.findMany({
        where: { documentId: id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return { collaborators };
    } catch (error) {
      this.logger.error(`Error fetching collaborators: ${error.message}`);
      throw error;
    }
  }

  async addCollaborator(id: string, collaboratorData: any) {
    try {
      const { userId, permission } = collaboratorData;

      const collaborator = await this.prisma.documentCollaborator.create({
        data: {
          documentId: id,
          userId,
          permission: permission || 'read',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`Added collaborator ${userId} to document ${id}`);
      return { collaborator };
    } catch (error) {
      this.logger.error(`Error adding collaborator: ${error.message}`);
      throw error;
    }
  }

  async removeCollaborator(id: string, userId: string) {
    try {
      await this.prisma.documentCollaborator.deleteMany({
        where: {
          documentId: id,
          userId,
        },
      });

      this.logger.log(`Removed collaborator ${userId} from document ${id}`);
      return { success: true, message: 'Collaborator removed' };
    } catch (error) {
      this.logger.error(`Error removing collaborator: ${error.message}`);
      throw error;
    }
  }
}
