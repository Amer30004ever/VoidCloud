import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiConsumes } from '@nestjs/swagger';
import { LearningService } from './learning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Learning')
@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  // DevOps Jobs
  @Get('jobs')
  @ApiOperation({ summary: 'Get DevOps job listings' })
  async getJobs(
    @Query('source') source?: string,
    @Query('keyword') keyword?: string,
    @Query('location') location?: string,
  ) {
    return this.learningService.getJobs(source, keyword, location);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job details' })
  async getJobDetails(@Param('id') id: string) {
    return this.learningService.getJobDetails(id);
  }

  @Post('jobs/saved')
  @ApiOperation({ summary: 'Save job to favorites' })
  async saveJob(@Body() jobData: { jobId: string; userId: string }) {
    return this.learningService.saveJob(jobData);
  }

  @Get('jobs/saved/:userId')
  @ApiOperation({ summary: 'Get saved jobs for user' })
  async getSavedJobs(@Param('userId') userId: string) {
    return this.learningService.getSavedJobs(userId);
  }

  @Delete('jobs/saved/:id')
  @ApiOperation({ summary: 'Remove saved job' })
  async removeSavedJob(@Param('id') id: string) {
    return this.learningService.removeSavedJob(id);
  }

  // Tech News
  @Get('news')
  @ApiOperation({ summary: 'Get tech news articles' })
  async getNews(
    @Query('source') source?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.learningService.getNews(source, category, limit ? parseInt(limit) : 20);
  }

  @Get('news/:id')
  @ApiOperation({ summary: 'Get news article details' })
  async getNewsDetails(@Param('id') id: string) {
    return this.learningService.getNewsDetails(id);
  }

  // Learning Paths
  @Get('paths')
  @ApiOperation({ summary: 'Get all learning paths' })
  async getLearningPaths(@Query('category') category?: string) {
    return this.learningService.getLearningPaths(category);
  }

  @Get('paths/:id')
  @ApiOperation({ summary: 'Get learning path details' })
  async getLearningPath(@Param('id') id: string) {
    return this.learningService.getLearningPath(id);
  }

  @Post('paths/:id/enroll')
  @ApiOperation({ summary: 'Enroll in learning path' })
  async enrollInPath(@Param('id') id: string, @Body() enrollmentData: { userId: string }) {
    return this.learningService.enrollInPath(id, enrollmentData.userId);
  }

  @Get('paths/:id/progress/:userId')
  @ApiOperation({ summary: 'Get learning path progress' })
  async getPathProgress(@Param('id') id: string, @Param('userId') userId: string) {
    return this.learningService.getPathProgress(id, userId);
  }

  @Put('paths/:id/progress/:userId')
  @ApiOperation({ summary: 'Update learning path progress' })
  async updatePathProgress(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() progressData: any,
  ) {
    return this.learningService.updatePathProgress(id, userId, progressData);
  }

  // Certifications
  @Get('certifications')
  @ApiOperation({ summary: 'Get all certifications' })
  async getCertifications(@Query('provider') provider?: string) {
    return this.learningService.getCertifications(provider);
  }

  @Get('certifications/:id')
  @ApiOperation({ summary: 'Get certification details' })
  async getCertification(@Param('id') id: string) {
    return this.learningService.getCertification(id);
  }

  @Post('certifications/tracker')
  @ApiOperation({ summary: 'Track user certification progress' })
  async trackCertification(@Body() trackerData: any) {
    return this.learningService.trackCertification(trackerData);
  }

  @Get('certifications/tracker/:userId')
  @ApiOperation({ summary: 'Get user certification tracker' })
  async getCertificationTracker(@Param('userId') userId: string) {
    return this.learningService.getCertificationTracker(userId);
  }

  @Put('certifications/tracker/:id')
  @ApiOperation({ summary: 'Update certification tracker' })
  async updateCertificationTracker(@Param('id') id: string, @Body() updateData: any) {
    return this.learningService.updateCertificationTracker(id, updateData);
  }

  // CV Studio
  @Get('cv')
  @ApiOperation({ summary: 'Get all CVs for user' })
  async getCVs(@Query('userId') userId: string) {
    return this.learningService.getCVs(userId);
  }

  @Get('cv/:id')
  @ApiOperation({ summary: 'Get CV details' })
  async getCV(@Param('id') id: string) {
    return this.learningService.getCV(id);
  }

  @Post('cv')
  @ApiOperation({ summary: 'Create new CV' })
  async createCV(@Body() cvData: any) {
    return this.learningService.createCV(cvData);
  }

  @Put('cv/:id')
  @ApiOperation({ summary: 'Update CV' })
  async updateCV(@Param('id') id: string, @Body() cvData: any) {
    return this.learningService.updateCV(id, cvData);
  }

  @Delete('cv/:id')
  @ApiOperation({ summary: 'Delete CV' })
  async deleteCV(@Param('id') id: string) {
    return this.learningService.deleteCV(id);
  }

  @Post('cv/:id/compile')
  @ApiOperation({ summary: 'Compile LaTeX CV to PDF' })
  async compileCV(@Param('id') id: string) {
    return this.learningService.compileCV(id);
  }

  @Post('cv/:id/ats-score')
  @ApiOperation({ summary: 'Get ATS score for CV' })
  async getATSScore(@Param('id') id: string, @Body() jobDescription?: string) {
    return this.learningService.getATSScore(id, jobDescription);
  }

  @Post('cv/:id/optimize')
  @ApiOperation({ summary: 'AI-optimize CV for job description' })
  async optimizeCV(@Param('id') id: string, @Body() optimizationData: { jobDescription: string }) {
    return this.learningService.optimizeCV(id, optimizationData.jobDescription);
  }

  @Post('cv/:id/export')
  @ApiOperation({ summary: 'Export CV to different format' })
  async exportCV(@Param('id') id: string, @Body() exportData: { format: 'pdf' | 'docx' | 'markdown' | 'html' }) {
    return this.learningService.exportCV(id, exportData.format);
  }

  @Get('cv/templates')
  @ApiOperation({ summary: 'Get CV templates' })
  async getCVTemplates(@Query('category') category?: string) {
    return this.learningService.getCVTemplates(category);
  }

  @Post('cv/:id/github-import')
  @ApiOperation({ summary: 'Import GitHub projects to CV' })
  async importGitHubProjects(@Param('id') id: string, @Body() githubData: { username: string }) {
    return this.learningService.importGitHubProjects(id, githubData.username);
  }

  // Conferences
  @Get('conferences')
  @ApiOperation({ summary: 'Get upcoming conferences' })
  async getConferences(@Query('year') year?: string) {
    return this.learningService.getConferences(year);
  }

  @Post('conferences/:id/register')
  @ApiOperation({ summary: 'Register interest in conference' })
  async registerConferenceInterest(@Param('id') id: string, @Body() userData: { userId: string }) {
    return this.learningService.registerConferenceInterest(id, userData.userId);
  }

  // Books
  @Get('books')
  @ApiOperation({ summary: 'Get recommended books' })
  async getBooks(@Query('category') category?: string) {
    return this.learningService.getBooks(category);
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get book details' })
  async getBook(@Param('id') id: string) {
    return this.learningService.getBook(id);
  }

  @Post('books/tracker')
  @ApiOperation({ summary: 'Track book reading progress' })
  async trackBook(@Body() trackerData: any) {
    return this.learningService.trackBook(trackerData);
  }

  @Get('books/tracker/:userId')
  @ApiOperation({ summary: 'Get user book tracker' })
  async getBookTracker(@Param('userId') userId: string) {
    return this.learningService.getBookTracker(userId);
  }

  // Blog Posts
  @Get('blog')
  @ApiOperation({ summary: 'Get blog posts' })
  async getBlogPosts(@Query('category') category?: string) {
    return this.learningService.getBlogPosts(category);
  }

  @Get('blog/:id')
  @ApiOperation({ summary: 'Get blog post details' })
  async getBlogPost(@Param('id') id: string) {
    return this.learningService.getBlogPost(id);
  }

  @Post('blog')
  @ApiOperation({ summary: 'Create blog post' })
  async createBlogPost(@Body() postData: any) {
    return this.learningService.createBlogPost(postData);
  }

  @Put('blog/:id')
  @ApiOperation({ summary: 'Update blog post' })
  async updateBlogPost(@Param('id') id: string, @Body() postData: any) {
    return this.learningService.updateBlogPost(id, postData);
  }

  @Delete('blog/:id')
  @ApiOperation({ summary: 'Delete blog post' })
  async deleteBlogPost(@Param('id') id: string) {
    return this.learningService.deleteBlogPost(id);
  }
}
