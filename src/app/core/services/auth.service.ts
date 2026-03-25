import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { 
  AuthResponseDTO, 
  LoginDTO, 
  ProfileDto, 
  VerifyEmailDTO, 
  ResendCodeDTO, 
  ForgotPasswordDTO, 
  ResetPasswordDTO, 
  RegisterResponseDTO 
} from '../models/api.models';
import { ProfileService } from './profile.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userProfileSubject = new BehaviorSubject<any>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  private profileService = inject(ProfileService);

  constructor(private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) this.tokenSubject.next(token);
    }
  }

  register(data: any, type: string): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.apiUrl}/api/auth/register/${type}`, data).pipe(
      tap((res) => {
        console.log('Registration response:', res);
        // Auto-login after successful registration
        if (res.token && isPlatformBrowser(this.platformId)) {
          console.log('Setting token from registration:', res.token);
          localStorage.setItem('token', res.token);
          if (res.role) localStorage.setItem('userRole', res.role);
          if (res.userId) localStorage.setItem('userId', res.userId);
          this.tokenSubject.next(res.token);
        } else {
          console.log('No token in registration response - user will need to login');
        }
      })
    );
  }

  login(credentials: LoginDTO): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.apiUrl}/api/auth/login`, credentials).pipe(
      tap((res) => {
        if (res.token && isPlatformBrowser(this.platformId)) {
          console.log('=== LOGIN PROCESS START ===');
          localStorage.setItem('token', res.token);
          if (res.role) localStorage.setItem('userRole', res.role);
          if (res.userId) localStorage.setItem('userId', res.userId);
          this.tokenSubject.next(res.token);
          
          console.log('Login successful - token set, role:', res.role);
          
          // Restore profile completion flag if it was permanently set
          const permanentFlag = localStorage.getItem('pswProfileCompletePermanent');
          console.log('Permanent flag found in localStorage:', permanentFlag);
          
          if (permanentFlag === '1') {
            localStorage.setItem('pswProfileComplete', '1');
            console.log('✅ Restored profile completion flag from permanent storage after login');
            console.log('New temp flag:', localStorage.getItem('pswProfileComplete'));
          } else {
            console.log('❌ No permanent flag found - user needs to complete profile');
          }
          
          console.log('=== LOGIN PROCESS END ===');
        }
      })
    );
  }

  logout(): void {
    // Make the logout API call first while we still have the token
    const currentToken = this.getToken();
    
    console.log('=== LOGOUT PROCESS START ===');
    console.log('Permanent flag before logout:', localStorage.getItem('pswProfileCompletePermanent'));
    
    if (currentToken) {
      this.http.post<void>(`${this.apiUrl}/api/auth/logout`, {}).subscribe({
        next: () => {
          console.log('Logout successful');
        },
        error: (err) => {
          // Silently handle logout errors - 401 is expected for expired tokens
          // Don't log anything for logout errors to keep console clean
        }
      });
    }
    
    // Clear local data regardless of API call success
    this.clearUserProfile();
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('pswProfileComplete'); // Remove temporary flag
      localStorage.removeItem('pswNeedsProfileCompletion');
      localStorage.removeItem('pswVerificationStatus');
      // Keep pswProfileCompletePermanent - it should survive logout
      console.log('Permanent flag after logout:', localStorage.getItem('pswProfileCompletePermanent'));
      this.tokenSubject.next(null);
    }
    
    console.log('=== LOGOUT PROCESS END ===');
  }

  verifyEmail(body: VerifyEmailDTO): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.apiUrl}/api/auth/verify-email`, body).pipe(
      tap((res) => {
        if (res.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.token);
          if (res.role) localStorage.setItem('userRole', res.role);
          if (res.userId) localStorage.setItem('userId', res.userId);
          this.tokenSubject.next(res.token);
        }
      })
    );
  }

  resendVerification(body: ResendCodeDTO): Observable<RegisterResponseDTO> {
    return this.http.post<RegisterResponseDTO>(`${this.apiUrl}/api/auth/resend-verification`, body);
  }

  forgotPassword(email: string): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/api/auth/forgot-password`, { email });
  }

  resetPassword(payload: any): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/api/auth/reset-password`, payload);
  }

  getUserRole(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('userRole') : null;
  }

  getUserId(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('userId') : null;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  updateToken(token: string): void {
    this.tokenSubject.next(token);
  }

  isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  setProfileComplete(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('pswProfileComplete', '1');
      // Also set a permanent flag that survives logout
      localStorage.setItem('pswProfileCompletePermanent', '1');
      console.log('Profile completion flag set in localStorage (both temporary and permanent)');
    }
  }

  isProfileComplete(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    
    const tempFlag = localStorage.getItem('pswProfileComplete');
    const permanentFlag = localStorage.getItem('pswProfileCompletePermanent');
    
    console.log('Profile completion check - temp:', tempFlag, 'permanent:', permanentFlag);
    
    return tempFlag === '1' || permanentFlag === '1';
  }

  setNeedsProfileCompletion(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('pswNeedsProfileCompletion', '1');
      console.log('✅ setNeedsProfileCompletion: Flag set in localStorage');
      console.log('Current localStorage value:', localStorage.getItem('pswNeedsProfileCompletion'));
    } else {
      console.log('❌ setNeedsProfileCompletion: Not in browser environment');
    }
  }

  needsFreshRegistration(): boolean {
    const isBrowser = isPlatformBrowser(this.platformId);
    const flagValue = isBrowser ? localStorage.getItem('pswNeedsProfileCompletion') : null;
    const result = flagValue === '1';
    
    console.log('needsFreshRegistration():', {
      isBrowser,
      flagValue,
      result
    });
    
    return result;
  }

  getNeedsProfileCompletion(): boolean {
    return this.needsFreshRegistration();
  }

  clearNeedsProfileCompletion(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('pswNeedsProfileCompletion');
    }
  }

  setVerificationStatus(status: 'pending' | 'approved' | 'rejected'): void {
    const profile = this.getUserProfile() || {};
    this.userProfileSubject.next({ ...profile, verificationStatus: status });
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('pswVerificationStatus', status);
    }
  }

  getVerificationStatus(): string | null {
    const profile = this.getUserProfile();
    return profile?.verificationStatus || null;
  }

  clearUserProfile(): void {
    this.userProfileSubject.next(null);
  }

  loadUserProfile(): Observable<ProfileDto> {
    return this.profileService.getMyProfile().pipe(
      tap((profile: ProfileDto) => {
        console.log('!!! SERVER PROFILE DATA:', JSON.stringify(profile, null, 2));
        // Raw pass-through - no modification
        this.userProfileSubject.next(profile);
      })
    );
  }

  getUserProfile(): any | null {
    return this.userProfileSubject.value;
  }
}

