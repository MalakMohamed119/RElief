import { Routes } from '@angular/router';
import { LoginComponent } from './core/auth/login/login';
import { ForgotPasswordComponent } from './core/auth/forgot-password/forgot-password';
import { VerifyEmailComponent } from './core/auth/verify-email/verify-email';
import { NotFound } from './features/not-found/not-found';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/auth-guards-guard';
import { profileCompleteGuard } from './core/guards/profile-complete.guard';

export const routes: Routes = [
  // التوجيه الأساسي
  { path: '', redirectTo: '/login', pathMatch: 'full' }, 
  
  // Auth routes
  { path: 'login', component: LoginComponent },
  { path: 'register', loadComponent: () => import('./core/auth/register/register').then(m => m.RegisterComponent) },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  
  // Care Home Module
  {
    path: 'care-home',
    canActivate: [roleGuard],
    data: { role: ['carehome', 'individual'] }, 
    children: [
      { 
        path: '', 
        loadComponent: () => import('./features/careHome/components/care-home-home/care-home-home').then(m => m.CareHomeHome) 
      },
      { 
        path: 'history', 
        loadComponent: () => import('./features/careHome/components/history/history').then(m => m.History)
      },
      { 
        path: 'notifications', 
        loadComponent: () => import('./features/careHome/components/notifications/notifications').then(m => m.Notifications) 
      },
      { 
        path: 'profile', 
        loadComponent: () => import('./features/careHome/components/care-home-profile/care-home-profile').then(m => m.CareHomeProfile) 
      },
    ]
  },

  // PSW Module
  {
    path: 'psw',
    data: { role: 'psw' },
    canActivate: [authGuard, roleGuard, profileCompleteGuard],
    children: [
      { path: '', redirectTo: 'offers', pathMatch: 'full' },
      {
        path: 'offers',
        loadComponent: () => import('./features/psw/components/offers/offers').then(m => m.PswOffers)
      },

      {
        path: 'profile',
        loadComponent: () => import('./features/psw/components/psw-profile/psw-profile').then(m => m.PswProfile)
      },
      {
        path: 'history',
        loadComponent: () => import('./features/psw/components/history/history').then(m => m.History)
      },
    ]
  },
  
  // PSW Complete Profile - Public route (no auth required)
  {
    path: 'psw/complete-profile',
    loadComponent: () => import('./features/psw/components/complete-profile/complete-profile').then(m => m.PswCompleteProfile)
  },
  // Admin Module
  {
    path: 'admin',
    canActivate: [roleGuard],
    data: { role: 'admin' },
    children: [
      {
        path: '',
        redirectTo: '/admin/dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/components/admin-dashboard/admin-dashboard').then(
            (m) => m.AdminDashboard
          ),
      },
      {
        path: 'verifications',
        loadComponent: () =>
          import('./features/admin/components/admin-verifications/admin-verifications').then(
            (m) => m.AdminVerifications
          ),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./features/admin/components/admin-applications/admin-applications').then(
            (m) => m.AdminApplications
          ),
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./features/admin/components/admin-offers/admin-offers').then(
            (m) => m.AdminOffers
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/components/admin-users/admin-users').then(
            (m) => m.AdminUsers
          ),
      },
    ]
  },
  
  // 404
  { path: '**', component: NotFound }
];