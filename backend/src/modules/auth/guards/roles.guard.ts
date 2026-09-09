import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException({
        success: false,
        message: 'Access forbidden. Role permission required.',
        errors: ['FORBIDDEN_ROLE'],
      });
    }

    const userRoleLower = String(user.role).toLowerCase();
    const hasRole = requiredRoles.some((role) => {
      const requiredLower = String(role).toLowerCase();
      return (
        userRoleLower === requiredLower ||
        (userRoleLower === 'super admin' && requiredLower === 'admin') ||
        (userRoleLower === 'admin' && requiredLower === 'super admin')
      );
    });

    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        message: `Access forbidden. Requires one of roles: [${requiredRoles.join(', ')}]`,
        errors: ['FORBIDDEN_ROLE'],
      });
    }

    return true;
  }
}
