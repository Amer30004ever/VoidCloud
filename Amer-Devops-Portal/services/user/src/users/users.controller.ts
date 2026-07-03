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
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
} from './dto/create-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  list(@Query('role') role?: Role) {
    return this.usersService.listUsers(role);
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  search(@Query('q') q?: string) {
    return this.usersService.searchUsers(q ?? '');
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.createUser(dto, user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  get(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.updateUser(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.deleteUser(id, user.id);
  }

  @Post(':id/role')
  @Roles(Role.SUPER_ADMIN)
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.assignRole(id, dto.role, user.id);
  }

  @Post(':id/suspend')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  suspend(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.suspendUser(id, body?.reason, user.id);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  activate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.usersService.activateUser(id, user.id);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.usersService.resetUserPassword(id, dto, user.id);
  }
}
