import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/create-user.dto';
export declare class UsersService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private logAudit;
    listUsers(role?: Role): Promise<{
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
    searchUsers(query: string): Promise<{
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
    getUser(id: string): Promise<{
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
    createUser(dto: CreateUserDto, actorId?: string): Promise<{
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
    updateUser(id: string, dto: UpdateUserDto, actorId?: string): Promise<{
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
    assignRole(id: string, role: Role, actorId?: string): Promise<{
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
    suspendUser(id: string, reason?: string, actorId?: string): Promise<{
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
    activateUser(id: string, actorId?: string): Promise<{
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
    resetUserPassword(id: string, dto: ResetPasswordDto, actorId?: string): Promise<{
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
    deleteUser(id: string, actorId?: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
