import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CrmService } from './crm.service';
import {
  CreateActivityDto,
  CreateCompanyDto,
  CreateContactDto,
  CreateDealDto,
  CreateLeadDto,
  CreateTaskDto,
  CreateWhatsappMessageDto,
  ListQueryDto,
  UpdateActivityDto,
  UpdateCompanyDto,
  UpdateContactDto,
  UpdateDealDto,
  UpdateDealStageDto,
  UpdateLeadDto,
  UpdateTaskDto,
  UpdateWhatsappMessageDto,
} from './dto/crm.dto';

type AuthUser = { id: string; role: Role };

@Controller('crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.AGENT, Role.SUPER_ADMIN)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  // ---------------------------------------------------------------- Contacts

  @Get('customers')
  listCustomers(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listCustomers(user, query);
  }

  @Post('customers')
  createCustomer(@CurrentUser() user: AuthUser, @Body() body: CreateContactDto) {
    return this.crm.createCustomer(user, body as never);
  }

  @Get('customers/:id')
  getCustomer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getCustomer(id, user);
  }

  @Put('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() body: UpdateContactDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateCustomer(id, body as never, user);
  }

  @Delete('customers/:id')
  deleteCustomer(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteCustomer(id, user);
  }

  // ------------------------------------------------------------------- Leads

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listLeads(user, query);
  }

  @Post('leads')
  createLead(@CurrentUser() user: AuthUser, @Body() body: CreateLeadDto) {
    return this.crm.createLead(user, body as never);
  }

  @Get('leads/:id')
  getLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getLead(id, user);
  }

  @Put('leads/:id')
  updateLead(
    @Param('id') id: string,
    @Body() body: UpdateLeadDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateLead(id, body as never, user);
  }

  @Delete('leads/:id')
  deleteLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteLead(id, user);
  }

  @Put('leads/:id/convert')
  convertLead(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.convertLead(id, user);
  }

  // --------------------------------------------------------------- Companies

  @Get('companies')
  listCompanies(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listCompanies(user, query);
  }

  @Post('companies')
  createCompany(@CurrentUser() user: AuthUser, @Body() body: CreateCompanyDto) {
    return this.crm.createCompany(user, body as never);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getCompany(id, user);
  }

  @Put('companies/:id')
  updateCompany(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateCompany(id, body as never, user);
  }

  @Delete('companies/:id')
  deleteCompany(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteCompany(id, user);
  }

  // ------------------------------------------------------------------- Deals

  @Get('deals')
  listDeals(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listDeals(user, query);
  }

  @Post('deals')
  createDeal(@CurrentUser() user: AuthUser, @Body() body: CreateDealDto) {
    return this.crm.createDeal(user, body as never);
  }

  @Get('deals/:id')
  getDeal(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getDeal(id, user);
  }

  @Put('deals/:id')
  updateDeal(
    @Param('id') id: string,
    @Body() body: UpdateDealDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateDeal(id, body as never, user);
  }

  @Put('deals/:id/stage')
  updateDealStage(
    @Param('id') id: string,
    @Body() body: UpdateDealStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateDealStage(id, body.stage, user);
  }

  @Delete('deals/:id')
  deleteDeal(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteDeal(id, user);
  }

  // ------------------------------------------------------------------- Tasks

  @Get('tasks')
  listTasks(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listTasks(user, query);
  }

  @Post('tasks')
  createTask(@CurrentUser() user: AuthUser, @Body() body: CreateTaskDto) {
    return this.crm.createTask(user, body as never);
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getTask(id, user);
  }

  @Put('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body() body: UpdateTaskDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateTask(id, body as never, user);
  }

  @Put('tasks/:id/complete')
  completeTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.completeTask(id, user);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteTask(id, user);
  }

  // -------------------------------------------------------------- Activities

  @Get('activities')
  listActivities(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listActivities(user, query);
  }

  @Post('activities')
  createActivity(@CurrentUser() user: AuthUser, @Body() body: CreateActivityDto) {
    return this.crm.createActivity(user, body as never);
  }

  @Get('activities/:id')
  getActivity(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getActivity(id, user);
  }

  @Put('activities/:id')
  updateActivity(
    @Param('id') id: string,
    @Body() body: UpdateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateActivity(id, body as never, user);
  }

  @Delete('activities/:id')
  deleteActivity(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteActivity(id, user);
  }

  // -------------------------------------------------------- WhatsApp messages

  @Get('messages')
  listMessages(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    return this.crm.listMessages(user, query);
  }

  @Get('messages/contact/:contactId')
  listMessagesForContact(
    @Param('contactId') contactId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListQueryDto,
  ) {
    return this.crm.listMessagesForContact(contactId, user, query);
  }

  @Post('messages')
  createMessage(@CurrentUser() user: AuthUser, @Body() body: CreateWhatsappMessageDto) {
    return this.crm.createMessage(user, body as never);
  }

  @Get('messages/:id')
  getMessage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.getMessage(id, user);
  }

  @Put('messages/:id')
  updateMessage(
    @Param('id') id: string,
    @Body() body: UpdateWhatsappMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crm.updateMessage(id, body as never, user);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crm.deleteMessage(id, user);
  }
}
