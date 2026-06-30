import { CanActivate, ExecutionContext } from '@nestjs/common';
import { RbacService } from '../../rbac/rbac.service';
export declare class TenantGuard implements CanActivate {
    private rbacService;
    constructor(rbacService: RbacService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
