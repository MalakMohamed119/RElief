import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, throwError, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

function requestPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const q = url.indexOf('?');
    const base = q >= 0 ? url.slice(0, q) : url;
    const api = base.indexOf('/api/');
    return api >= 0 ? base.slice(api) : base;
  }
}

/** Unauthenticated auth flows (paths vary by server: /api/auth vs /api/Auth, etc.) */
function isPublicAuthRequest(url: string): boolean {
  const p = requestPath(url).toLowerCase();
  if (p.includes('/api/auth/login')) return true;
  if (p.includes('/api/auth/register')) return true;
  // logout should be treated as public since token is being cleared
  if (p.includes('/api/auth/logout')) return true;
  if (p.includes('/api/auth/verify-email')) return true;
  if (p.includes('/api/auth/resend-verification')) return true;
  if (p.includes('forgot-password') || p.includes('forgotpassword')) return true;
  if (p.includes('request-password-reset') || p.includes('send-reset-code')) return true;
  if (/\/forgot(\/|$|\?)/.test(p) || p.includes('/password/forgot')) return true;
  if (p.includes('reset-password') || p.includes('resetpassword')) return true;
  return false;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const auth = inject(AuthService);

  const isPublicEndpoint = isPublicAuthRequest(req.url);
  
  console.log('HTTP Request:', {
    url: req.url,
    method: req.method,
    isPublicEndpoint,
    hasToken: !!localStorage.getItem('token')
  });

  // Only add token for protected endpoints
  if (isPlatformBrowser(platformId) && !isPublicEndpoint) {
    const token = localStorage.getItem('token');
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
      console.log('Added token to request:', req.url);
    }
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Skip all error handling and logging for logout 401 errors (expected behavior)
      if (req.url.includes('/auth/logout') && err.status === 401) {
        // Return empty observable to silently complete the request
        return throwError(() => new Error('Logout completed'));
      }
      
      console.log('HTTP Error:', {
        url: req.url,
        status: err.status,
        statusText: err.statusText,
        isPublicEndpoint
      });
      
      // Only trigger logout for 401 errors on PROTECTED endpoints
      // For login/register, a 401 means invalid credentials, not expired session
      if (err?.status === 401 && isPlatformBrowser(platformId) && !isPublicEndpoint) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { expired: '1' } });
      }
      return throwError(() => err);
    })
  );
};
