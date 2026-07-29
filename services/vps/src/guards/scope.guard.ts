import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredScopes || requiredScopes.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.apiKey) return true;

    const apiKeyScopes = (user.apiKey.scopes as string[]) ?? [];

    for (const scope of requiredScopes) {
      if (!apiKeyScopes.includes(scope)) {
        throw new ForbiddenException(`Missing required scope: ${scope}`);
      }
    }

    return true;
  }
}
