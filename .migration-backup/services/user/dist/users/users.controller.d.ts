import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/create-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(role?: Role): Promise<{
        users: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    search(q?: string): Promise<{
        users: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    create(dto: CreateUserDto, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
        temporaryPassword: string;
        mustChangePassword: boolean;
    }>;
    get(id: string): Promise<{
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    update(id: string, dto: UpdateUserDto, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    delete(id: string, user: {
        id: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    assignRole(id: string, dto: AssignRoleDto, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    suspend(id: string, body: {
        reason?: string;
    }, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    activate(id: string, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    resetPassword(id: string, dto: ResetPasswordDto, user: {
        id: string;
    }): Promise<{
        success: boolean;
        user: {
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isActive: boolean;
            id: string;
            mustChangePassword: boolean;
            suspendedAt: Date;
            suspendedReason: string;
            createdAt: Date;
            updatedAt: Date;
        };
        temporaryPassword: string;
        mustChangePassword: boolean;
    }>;
}
