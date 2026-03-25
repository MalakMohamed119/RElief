import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const notification = inject(NotificationService);
  const platformId = inject(PLATFORM_ID);

  // SSR check
  if (!isPlatformBrowser(platformId)) return true;

  // Get role from route data - handle both string and array formats
  let expectedRoles: string[] = [];
  const routeData = route.data;
  
  if (Array.isArray(routeData)) {
    // data is an array
    expectedRoles = routeData.map(r => String(r).trim().toLowerCase()).filter(r => r.length > 0);
  } else if (routeData) {
    // data is an object
    const roleOrRoles = (routeData as any)['role'] || (routeData as any)['roles'];
    if (Array.isArray(roleOrRoles)) {
      expectedRoles = roleOrRoles.map((r: any) => String(r).trim().toLowerCase()).filter((r: string) => r.length > 0);
    } else if (roleOrRoles) {
      expectedRoles = [String(roleOrRoles).trim().toLowerCase()];
    }
  }

  // Get user role
  let userRole = authService.getUserRole();
  console.log('Role Guard Check:', {
    expectedRoles,
    userRole,
    userRoleLower: userRole ? String(userRole).trim().toLowerCase() : null,
    routePath: state.url
  });
  
  if (userRole) {
    userRole = String(userRole).trim().toLowerCase();
  } else {
    userRole = '';
  }

  // 1. Check if user is logged in
  if (!authService.isAuthenticated()) {
    console.log('User not authenticated, redirecting to login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // 2. Allow access if no roles specified
  if (expectedRoles.length === 0) {
    console.log('No roles specified, allowing access');
    return true;
  }

  // 3. Check if user role matches
  const hasRole = expectedRoles.includes(userRole);
  console.log('Role comparison:', { hasRole, userRole, expectedRoles });

  if (hasRole) {
    return true;
  }

  // 4. Access denied - redirect based on role
  notification.show('Access Denied: You do not have permission to view this page.', 'error');
  
  let redirectPath = '/login';
  if (userRole === 'carehome' || userRole === 'individual') {
    redirectPath = '/care-home';
  } else if (userRole === 'psw') {
    redirectPath = '/psw';
  } else if (userRole === 'admin') {
    redirectPath = '/admin/dashboard';
  }

  console.log('Access denied, redirecting to:', redirectPath);
  router.navigate([redirectPath]);
  return false;
};
