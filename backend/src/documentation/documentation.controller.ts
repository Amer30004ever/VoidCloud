import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiConsumes } from '@nestjs/swagger';
import { DocumentationService } from './documentation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';

@ApiTags('Documentation')
@Controller('documentation')
@UseGuards(JwtAuthGuard)
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Get all documents' })
  @ApiOkResponse({
    description: 'Returns list of documents with metadata',
  })
  async getDocuments(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ) {
    return this.documentationService.getDocuments(category, tag);
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(@Param('id') id: string) {
    return this.documentationService.getDocument(id);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Create new document' })
  async createDocument(@Body() documentData: any) {
    return this.documentationService.createDocument(documentData);
  }

  @Put('documents/:id')
  @ApiOperation({ summary: 'Update document' })
  async updateDocument(@Param('id') id: string, @Body() documentData: any) {
    return this.documentationService.updateDocument(id, documentData);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Param('id') id: string) {
    return this.documentationService.deleteDocument(id);
  }

  @Get('documents/:id/versions')
  @ApiOperation({ summary: 'Get document version history' })
  async getDocumentVersions(@Param('id') id: string) {
    return this.documentationService.getDocumentVersions(id);
  }

  @Get('documents/:id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific version of document' })
  async getDocumentVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.documentationService.getDocumentVersion(id, versionId);
  }

  @Post('documents/:id/restore/:versionId')
  @ApiOperation({ summary: 'Restore document to specific version' })
  async restoreDocumentVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.documentationService.restoreDocumentVersion(id, versionId);
  }

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload document file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Multer.File, @Body() metadata: any) {
    return this.documentationService.uploadDocument(file, metadata);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Download document file' })
  async downloadDocument(@Param('id') id: string) {
    return this.documentationService.downloadDocument(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all document categories' })
  async getCategories() {
    return this.documentationService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create new category' })
  async createCategory(@Body() categoryData: any) {
    return this.documentationService.createCategory(categoryData);
  }

  @Get('tags')
  @ApiOperation({ summary: 'Get all document tags' })
  async getTags() {
    return this.documentationService.getTags();
  }

  @Post('search')
  @ApiOperation({ summary: 'Full-text search across documents' })
  async searchDocuments(@Body() searchData: { query: string; category?: string; tags?: string[] }) {
    return this.documentationService.searchDocuments(searchData);
  }

  @Post('documents/:id/export')
  @ApiOperation({ summary: 'Export document to different format' })
  async exportDocument(@Param('id') id: string, @Body() exportData: { format: 'pdf' | 'html' | 'markdown' }) {
    return this.documentationService.exportDocument(id, exportData.format);
  }

  @Get('documents/:id/collaborators')
  @ApiOperation({ summary: 'Get document collaborators' })
  async getCollaborators(@Param('id') id: string) {
    return this.documentationService.getCollaborators(id);
  }

  @Post('documents/:id/collaborators')
  @ApiOperation({ summary: 'Add collaborator to document' })
  async addCollaborator(@Param('id') id: string, @Body() collaboratorData: any) {
    return this.documentationService.addCollaborator(id, collaboratorData);
  }

  @Delete('documents/:id/collaborators/:userId')
  @ApiOperation({ summary: 'Remove collaborator from document' })
  async removeCollaborator(@Param('id') id: string, @Param('userId') userId: string) {
    return this.documentationService.removeCollaborator(id, userId);
  }
}
