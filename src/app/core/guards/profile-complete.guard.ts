import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

export const profileCompleteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('=== PROFILE GUARD START ===');
  console.log('Profile guard - checking authentication...');
  
  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    console.log('Profile guard - user not authenticated, redirecting to login');
    return router.createUrlTree(['/login']);
  }

  console.log('Profile guard - user is authenticated, checking role...');

  // Check if user is PSW and needs profile completion
  const userRole = authService.getUserRole();
  const token = authService.getToken();
  
  console.log('Profile guard - user role:', userRole, 'has token:', !!token);
  
  if (userRole === 'psw') {
    // Check both server profile and localStorage flag
    const serverProfile = authService.getUserProfile();
    const profileCompleteFromStorage = authService.isProfileComplete();
    const verificationStatus = authService.getVerificationStatus();
    
    console.log('Profile guard FINAL check:');
    console.log('- Server profile complete:', serverProfile?.isProfileCompleted);
    console.log('- Storage profile complete:', profileCompleteFromStorage);
    console.log('- Verification status:', verificationStatus);
    
    // Allow access if: profile is completed OR verification is Pending/Approved
    const isProfileComplete = 
      serverProfile?.isProfileCompleted === true || 
      verificationStatus === 'Approved' ||
      verificationStatus === 'Pending' ||
      verificationStatus === 'pending';

    const needsCompleteProfile = !isProfileComplete;
    
    console.log('- Server profile complete:', serverProfile?.isProfileCompleted);
    console.log('- Verification status:', verificationStatus);
    console.log('- Final decision (needs complete profile?):', needsCompleteProfile);
    
    if (needsCompleteProfile) {
      console.log('REDIRECTING to complete-profile - profile not completed');
      console.log('=== PROFILE GUARD END (REDIRECT) ===');
      return router.createUrlTree(['/psw/complete-profile']);
    }
    
    console.log('ALLOWING access to PSW routes');
    console.log('=== PROFILE GUARD END (ALLOW) ===');
  }

  return true;
};
