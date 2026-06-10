import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(private prisma: PrismaService) {}

  // Team Chat Methods
  async getMessages(channelId?: string, limit?: number) {
    try {
      const where: any = {};
      if (channelId) where.channelId = channelId;

      const messages = await this.prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
      });
      return { messages };
    } catch (error) {
      this.logger.error(`Error fetching messages: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(messageData: {
    content: string;
    userId?: string;
    channelId?: string;
    conversationId?: string;
  }) {
    try {
      const data: any = {
        content: messageData.content,
        role: 'user',
      };

      if (messageData.channelId) {
        data.channelId = messageData.channelId;
      }
      if (messageData.conversationId) {
        data.conversationId = messageData.conversationId;
      }
      if (messageData.userId) {
        data.userId = messageData.userId;
      }

      const message = await this.prisma.message.create({
        data,
      });
      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  // Channels Methods
  async getChannels() {
    try {
      const channels = await this.prisma.channel.findMany({
        orderBy: { name: 'asc' },
      });
      return { channels };
    } catch (error) {
      this.logger.error(`Error fetching channels: ${error.message}`);
      throw error;
    }
  }

  async createChannel(channelData: {
    name: string;
    description?: string;
    isPrivate?: boolean;
    userId: string;
  }) {
    try {
      const channel = await this.prisma.channel.create({
        data: channelData,
      });
      return { success: true, channel };
    } catch (error) {
      this.logger.error(`Error creating channel: ${error.message}`);
      throw error;
    }
  }

  async updateChannel(id: string, channelData: any) {
    try {
      const channel = await this.prisma.channel.update({
        where: { id },
        data: channelData,
      });
      return { success: true, channel };
    } catch (error) {
      this.logger.error(`Error updating channel: ${error.message}`);
      throw error;
    }
  }

  async deleteChannel(id: string) {
    try {
      await this.prisma.channel.delete({
        where: { id },
      });
      return { success: true, message: 'Channel deleted' };
    } catch (error) {
      this.logger.error(`Error deleting channel: ${error.message}`);
      throw error;
    }
  }

  // Knowledge Base Methods
  async getArticles(category?: string, tag?: string) {
    try {
      const where: any = {};
      if (category) where.category = category;
      if (tag) where.tags = { has: tag };

      const articles = await this.prisma.knowledgeArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return { articles };
    } catch (error) {
      this.logger.error(`Error fetching articles: ${error.message}`);
      throw error;
    }
  }

  async getArticle(id: string) {
    try {
      const article = await this.prisma.knowledgeArticle.findUnique({
        where: { id },
      });
      return { article };
    } catch (error) {
      this.logger.error(`Error fetching article: ${error.message}`);
      throw error;
    }
  }

  async createArticle(articleData: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
  }) {
    try {
      const article = await this.prisma.knowledgeArticle.create({
        data: articleData,
      });
      return { success: true, article };
    } catch (error) {
      this.logger.error(`Error creating article: ${error.message}`);
      throw error;
    }
  }

  async updateArticle(id: string, articleData: any) {
    try {
      const article = await this.prisma.knowledgeArticle.update({
        where: { id },
        data: articleData,
      });
      return { success: true, article };
    } catch (error) {
      this.logger.error(`Error updating article: ${error.message}`);
      throw error;
    }
  }

  async deleteArticle(id: string) {
    try {
      await this.prisma.knowledgeArticle.delete({
        where: { id },
      });
      return { success: true, message: 'Article deleted' };
    } catch (error) {
      this.logger.error(`Error deleting article: ${error.message}`);
      throw error;
    }
  }

  // Code Reviews Methods
  async getReviews(status?: string) {
    try {
      const where: any = {};
      if (status) where.status = status;

      const reviews = await this.prisma.codeReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return { reviews };
    } catch (error) {
      this.logger.error(`Error fetching reviews: ${error.message}`);
      throw error;
    }
  }

  async createReview(reviewData: {
    title: string;
    description: string;
    repository: string;
    pullRequestUrl: string;
    userId: string;
  }) {
    try {
      const review = await this.prisma.codeReview.create({
        data: reviewData,
      });
      return { success: true, review };
    } catch (error) {
      this.logger.error(`Error creating review: ${error.message}`);
      throw error;
    }
  }

  async updateReview(id: string, reviewData: any) {
    try {
      const review = await this.prisma.codeReview.update({
        where: { id },
        data: reviewData,
      });
      return { success: true, review };
    } catch (error) {
      this.logger.error(`Error updating review: ${error.message}`);
      throw error;
    }
  }

  // Calendar Methods
  async getEvents(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = startDate;
        if (endDate) where.date.lte = endDate;
      }

      const events = await this.prisma.calendarEvent.findMany({
        where,
        orderBy: { date: 'asc' },
      });
      return { events };
    } catch (error) {
      this.logger.error(`Error fetching events: ${error.message}`);
      throw error;
    }
  }

  async createEvent(eventData: {
    title: string;
    description?: string;
    date: Date;
    time: string;
    attendees: string[];
    userId: string;
  }) {
    try {
      const event = await this.prisma.calendarEvent.create({
        data: eventData,
      });
      return { success: true, event };
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`);
      throw error;
    }
  }

  async updateEvent(id: string, eventData: any) {
    try {
      const event = await this.prisma.calendarEvent.update({
        where: { id },
        data: eventData,
      });
      return { success: true, event };
    } catch (error) {
      this.logger.error(`Error updating event: ${error.message}`);
      throw error;
    }
  }

  async deleteEvent(id: string) {
    try {
      await this.prisma.calendarEvent.delete({
        where: { id },
      });
      return { success: true, message: 'Event deleted' };
    } catch (error) {
      this.logger.error(`Error deleting event: ${error.message}`);
      throw error;
    }
  }
}
