import { Role } from '@prisma/client';
export declare enum PasswordMode {
    MANUAL = "manual",
    RANDOM = "random",
    FORCE_CHANGE = "force_change"
}
export declare class CreateUserDto {
    email: string;
    name: string;
    role: Role;
    passwordMode: PasswordMode;
    password?: string;
    isActive?: boolean;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class ResetPasswordDto {
    passwordMode: PasswordMode;
    password?: string;
}
export declare class UpdateUserDto {
    email?: string;
    name?: string;
    role?: Role;
    isActive?: boolean;
}
