export declare class CreateTenantDto {
    name: string;
    subdomain: string;
    settings?: Record<string, unknown>;
}
export declare class UpdateTenantDto {
    name?: string;
    subdomain?: string;
    status?: string;
    settings?: Record<string, unknown>;
}
export declare class UpdateTenantSettingsDto {
    settings: Record<string, unknown>;
}
