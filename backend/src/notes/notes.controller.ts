import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotesService, NoteInput } from './notes.service';

interface AuthedRequest { user: { id: string } }

@ApiTags('Notes')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Req() req: AuthedRequest, @Query('q') q?: string) {
    return this.notes.list(req.user.id, q);
  }

  @Get(':id')
  get(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.notes.get(req.user.id, id);
  }

  @Post()
  create(@Req() req: AuthedRequest, @Body() body: NoteInput) {
    return this.notes.create(req.user.id, body);
  }

  @Put(':id')
  update(@Req() req: AuthedRequest, @Param('id') id: string, @Body() body: Partial<NoteInput>) {
    return this.notes.update(req.user.id, id, body);
  }

  @Delete(':id')
  remove(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.notes.remove(req.user.id, id);
  }
}
