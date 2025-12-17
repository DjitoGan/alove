/**
 * [1] ADMIN ONLY GUARD
 *     Role-based access control guard
 *     Checks if authenticated user has ADMIN role
 *     Can be used with @UseGuards(AdminOnlyGuard) decorator
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  // [2] CAN ACTIVATE METHOD
  //     Called by NestJS on every request to a protected route
  //     Returns true if user is ADMIN, throws ForbiddenException otherwise
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // [3] GET REQUEST OBJECT
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // [4] CHECK IF USER EXISTS (SHOULD BE SET BY JWT GUARD)
    if (!user) {
      throw new ForbiddenException('User not found in request context');
    }

    // [5] CHECK IF USER HAS ADMIN ROLE
    //     user.role should be set by auth.service during token verification
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        `Access denied: User has role '${user.role}' but requires 'ADMIN'`,
      );
    }

    // [6] ALLOW ACCESS IF ADMIN
    return true;
  }
}
