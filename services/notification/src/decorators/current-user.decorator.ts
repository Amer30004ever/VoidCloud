import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Injects the current authenticated user into a route parameter.
 *  Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
