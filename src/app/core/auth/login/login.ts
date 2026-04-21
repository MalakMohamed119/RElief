import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  sessionExpired = false;
  loginError = '';
  private platformId = inject(PLATFORM_ID);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  ngOnInit(): void {
    this.sessionExpired = this.route.snapshot.queryParamMap.get('expired') === '1';
    this.loginError = '';
    
    // DEBUG: Log all flags on login page load
    console.log('=== LOGIN PAGE LOAD ===');
    console.log('localStorage flags:', {
      needsProfile: localStorage.getItem('pswNeedsProfileCompletion'),
      profileComplete: localStorage.getItem('pswProfileComplete'),
      profileCompletePerm: localStorage.getItem('pswProfileCompletePermanent')
    });
    
    // Immediate redirect check for already-authenticated PSW
    if (this.authService.isAuthenticated() && this.authService.getUserRole() === 'psw') {
      if (this.authService.getNeedsProfileCompletion()) {
        console.log('🚨 IMMEDIATE REDIRECT: Authenticated PSW needs profile');
        this.router.navigate(['/psw/complete-profile']);
        return;
      }
    }
    console.log('=== LOGIN PAGE LOAD END ===');
  }

  // Alias for onLogin to match template (ngSubmit)="onSubmit()"
  onSubmit(): void {
    this.onLogin();
  }

  onLogin(): void {
    // Clear previous error
    this.loginError = '';

    if (this.loginForm.invalid) {
      // mark controls as touched so per-field errors and invalid styles show
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;

    const loginData = this.loginForm.value;
    console.log('Submitting login with data:', {
      email: loginData.email,
      hasPassword: !!loginData.password
    });

    this.authService.login(loginData).subscribe({
      next: (res) => {
        console.log('Login response:', res);
        const role = (res.role ?? '').toLowerCase();
        
        // Fetch profile to get verification status for PSW users
        if (role === 'psw' || role === 'caregiver') {
          this.authService.loadUserProfile().subscribe({
            next: () => {
              console.log('Login profile loaded');
              this.navigateByRole(role);
            },
            error: () => {
              console.log('Profile load failed after login, continuing');
              this.navigateByRole(role);
            }
          });
        } else {
          this.navigateByRole(role);
        }
      },
      error: err => {
        console.error('Login error:', err);
        this.isLoading = false;
        
        if (err.status === 0) {
          this.loginError = 'Network error. Please check your connection.';
        } else if (err.status === 401) {
          this.loginError = 'Invalid email or password.';
        } else if (err.status === 403) {
          this.loginError = 'Access denied. Your account may be suspended.';
        } else if (err.status === 404) {
          this.loginError = 'Login service not found. Please try again.';
        } else {
          this.loginError = err.error?.message || 'An error occurred during login. Please try again.';
        }
      }
    });
  }

  private navigateByRole(role: string): void {
    console.log('=== LOGIN navigateByRole START ===');
    console.log('Role:', role);
    console.log('localStorage flags:', {
      needsProfile: localStorage.getItem('pswNeedsProfileCompletion'),
      profileComplete: localStorage.getItem('pswProfileComplete'),
      profileCompletePerm: localStorage.getItem('pswProfileCompletePermanent'),
      userRole: localStorage.getItem('userRole')
    });
    
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'carehome' || role === 'individual') {
      this.router.navigate(['/care-home']);
    } else if (role === 'psw') {
      // Clear force redirect flag after login success
      this.authService.clearNeedsProfileCompletion();
      
      // Backend profile check (aligned with guard)
      const serverProfile = this.authService.getUserProfile();
      const verificationStatus = this.authService.getVerificationStatus();
      const isProfileComplete = serverProfile?.isProfileCompleted === true || verificationStatus === 'Approved';
      
      console.log('PSW Login Flow Check:', {
        needsProfileCompletion: this.authService.getNeedsProfileCompletion(),
        isProfileComplete,
        verificationStatus,
        serverProfileCompleted: serverProfile?.isProfileCompleted,
        token: !!this.authService.getToken()
      });
      
      console.log('Login backend profile check:', {
        isProfileComplete,
        serverProfileCompleted: serverProfile?.isProfileCompleted,
        verificationStatus
      });
      
      if (!isProfileComplete) {
        console.log('PSW needs profile completion (backend check), redirecting');
        this.router.navigate(['/psw/complete-profile']);
      } else {
        console.log('PSW profile complete (backend check), going to dashboard');
        this.router.navigate(['/psw']);
      }
      console.log('=== LOGIN navigateByRole END ===');
    }
  }

  // Helper method to check for form control errors
  hasError(controlName: string, errorName: string): boolean {
    const control = this.loginForm.get(controlName);
    return control ? control.hasError(errorName) && (control.dirty || control.touched) : false;
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
}