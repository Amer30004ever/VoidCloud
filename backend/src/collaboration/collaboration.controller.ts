import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';

@ApiTags('Collaboration')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('collaboration')
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name);

  constructor(private readonly collaborationService: CollaborationService) {}

  // Team Chat Endpoints
  @Get('messages')
  @ApiOperation({ summary: 'Get messages' })
  async getMessages(
    @Query('channelId') channelId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.getMessages(
      channelId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(@Body() messageData: any) {
    return this.collaborationService.sendMessage(messageData);
  }

  // Channels Endpoints
  @Get('channels')
  @ApiOperation({ summary: 'Get all channels' })
  async getChannels() {
    return this.collaborationService.getChannels();
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create channel' })
  async createChannel(@Body() channelData: any) {
    return this.collaborationService.createChannel(channelData);
  }

  @Put('channels/:id')
  @ApiOperation({ summary: 'Update channel' })
  async updateChannel(@Param('id') id: string, @Body() channelData: any) {
    return this.collaborationService.updateChannel(id, channelData);
  }

  @Delete('channels/:id')
  @ApiOperation({ summary: 'Delete channel' })
  async deleteChannel(@Param('id') id: string) {
    return this.collaborationService.deleteChannel(id);
  }

  // Knowledge Base Endpoints
  @Get('knowledge')
  @ApiOperation({ summary: 'Get knowledge articles' })
  async getArticles(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.collaborationService.getArticles(category, tag);
  }

  @Get('knowledge/:id')
  @ApiOperation({ summary: 'Get article by ID' })
  async getArticle(@Param('id') id: string) {
    return this.collaborationService.getArticle(id);
  }

  @Post('knowledge')
  @ApiOperation({ summary: 'Create article' })
  async createArticle(@Body() articleData: any) {
    return this.collaborationService.createArticle(articleData);
  }

  @Put('knowledge/:id')
  @ApiOperation({ summary: 'Update article' })
  async updateArticle(@Param('id') id: string, @Body() articleData: any) {
    return this.collaborationService.updateArticle(id, articleData);
  }

  @Delete('knowledge/:id')
  @ApiOperation({ summary: 'Delete article' })
  async deleteArticle(@Param('id') id: string) {
    return this.collaborationService.deleteArticle(id);
  }

  // Code Reviews Endpoints
  @Get('reviews')
  @ApiOperation({ summary: 'Get code reviews' })
  async getReviews(@Query('status') status?: string) {
    return this.collaborationService.getReviews(status);
  }

  @Post('reviews')
  @ApiOperation({ summary: 'Create code review' })
  async createReview(@Body() reviewData: any) {
    return this.collaborationService.createReview(reviewData);
  }

  @Put('reviews/:id')
  @ApiOperation({ summary: 'Update code review' })
  async updateReview(@Param('id') id: string, @Body() reviewData: any) {
    return this.collaborationService.updateReview(id, reviewData);
  }

  // Calendar Endpoints
  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar events' })
  async getEvents(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.collaborationService.getEvents(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('calendar')
  @ApiOperation({ summary: 'Create calendar event' })
  async createEvent(@Body() eventData: any) {
    return this.collaborationService.createEvent(eventData);
  }

  @Put('calendar/:id')
  @ApiOperation({ summary: 'Update calendar event' })
  async updateEvent(@Param('id') id: string, @Body() eventData: any) {
    return this.collaborationService.updateEvent(id, eventData);
  }

  @Delete('calendar/:id')
  @ApiOperation({ summary: 'Delete calendar event' })
  async deleteEvent(@Param('id') id: string) {
    return this.collaborationService.deleteEvent(id);
  }
}
