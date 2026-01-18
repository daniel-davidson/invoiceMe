import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../interfaces/request-with-tenant';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.tenantId;
  },
);
