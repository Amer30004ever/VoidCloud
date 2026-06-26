import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CrmService, CreateLeadDto, UpdateLeadDto, CreateContactDto, UpdateContactDto, CreateCompanyDto, UpdateCompanyDto, CreateDealDto, UpdateDealDto, CreateTaskDto, UpdateTaskDto, CreateActivityDto } from './crm.service';

@ApiTags('CRM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private crmService: CrmService) {}

  @Get('stats')
  getStats(@Request() req) {
    return this.crmService.getStats(req.user);
  }

  // LEADS
  @Get('leads')
  getLeads(@Request() req) {
    return this.crmService.getLeads(req.user);
  }

  @Get('leads/:id')
  getLead(@Request() req, @Param('id') id: string) {
    return this.crmService.getLead(req.user, id);
  }

  @Post('leads')
  createLead(@Request() req, @Body() dto: CreateLeadDto) {
    return this.crmService.createLead(req.user, dto);
  }

  @Put('leads/:id')
  updateLead(@Request() req, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.crmService.updateLead(req.user, id, dto);
  }

  @Delete('leads/:id')
  deleteLead(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteLead(req.user, id);
  }

  // CONTACTS
  @Get('contacts')
  getContacts(@Request() req) {
    return this.crmService.getContacts(req.user);
  }

  @Get('contacts/:id')
  getContact(@Request() req, @Param('id') id: string) {
    return this.crmService.getContact(req.user, id);
  }

  @Post('contacts')
  createContact(@Request() req, @Body() dto: CreateContactDto) {
    return this.crmService.createContact(req.user, dto);
  }

  @Put('contacts/:id')
  updateContact(@Request() req, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.crmService.updateContact(req.user, id, dto);
  }

  @Delete('contacts/:id')
  deleteContact(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteContact(req.user, id);
  }

  // COMPANIES
  @Get('companies')
  getCompanies(@Request() req) {
    return this.crmService.getCompanies(req.user);
  }

  @Get('companies/:id')
  getCompany(@Request() req, @Param('id') id: string) {
    return this.crmService.getCompany(req.user, id);
  }

  @Post('companies')
  createCompany(@Request() req, @Body() dto: CreateCompanyDto) {
    return this.crmService.createCompany(req.user, dto);
  }

  @Put('companies/:id')
  updateCompany(@Request() req, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.crmService.updateCompany(req.user, id, dto);
  }

  @Delete('companies/:id')
  deleteCompany(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteCompany(req.user, id);
  }

  // DEALS
  @Get('deals')
  getDeals(@Request() req) {
    return this.crmService.getDeals(req.user);
  }

  @Get('deals/:id')
  getDeal(@Request() req, @Param('id') id: string) {
    return this.crmService.getDeal(req.user, id);
  }

  @Post('deals')
  createDeal(@Request() req, @Body() dto: CreateDealDto) {
    return this.crmService.createDeal(req.user, dto);
  }

  @Put('deals/:id')
  updateDeal(@Request() req, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.crmService.updateDeal(req.user, id, dto);
  }

  @Delete('deals/:id')
  deleteDeal(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteDeal(req.user, id);
  }

  // TASKS
  @Get('tasks')
  getTasks(@Request() req) {
    return this.crmService.getTasks(req.user);
  }

  @Get('tasks/:id')
  getTask(@Request() req, @Param('id') id: string) {
    return this.crmService.getTask(req.user, id);
  }

  @Post('tasks')
  createTask(@Request() req, @Body() dto: CreateTaskDto) {
    return this.crmService.createTask(req.user, dto);
  }

  @Put('tasks/:id')
  updateTask(@Request() req, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.crmService.updateTask(req.user, id, dto);
  }

  @Delete('tasks/:id')
  deleteTask(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteTask(req.user, id);
  }

  // ACTIVITIES
  @Get('activities')
  getActivities(@Request() req, @Param('leadId') leadId?: string) {
    return this.crmService.getActivities(req.user, leadId);
  }

  @Get('activities/:id')
  getActivity(@Request() req, @Param('id') id: string) {
    return this.crmService.getActivity(req.user, id);
  }

  @Post('activities')
  createActivity(@Request() req, @Body() dto: CreateActivityDto) {
    return this.crmService.createActivity(req.user, dto);
  }

  @Delete('activities/:id')
  deleteActivity(@Request() req, @Param('id') id: string) {
    return this.crmService.deleteActivity(req.user, id);
  }
}
