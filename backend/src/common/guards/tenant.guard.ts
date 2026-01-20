import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithTenant } from '../interfaces/request-with-tenant';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const user = request.user;

    if (!user || !user.sub) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Extract tenantId from JWT sub claim (Supabase user ID)
    request.tenantId = user.sub;

    return true;
  }
}
