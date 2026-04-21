import { Component, ChangeDetectorRef, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastComponent } from '../../../../shared/components/toast/toast';
import { CompleteProfileService } from '../../../../core/services/complete-profile.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-psw-complete-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ToastComponent],
  templateUrl: './complete-profile.html',
  styleUrls: ['./complete-profile.scss']
})
export class PswCompleteProfile implements OnInit {
  private svc = inject(CompleteProfileService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  form: FormGroup;
  isSubmitting = false;
  selectedFileNames: { [key: string]: string } = {};
  previews: { [key: string]: string } = {}; // للمعاينة الفورية

  constructor() {
    this.form = this.fb.group({
      proofIdentityType: ['ID', Validators.required],
      workStatus: [true],
      proofIdentityFile: [null],
      proofIdentityFileFront: [null],
      proofIdentityFileBack: [null],
      pswCertificateFile: [null, Validators.required],
      cvFile: [null, Validators.required],
      immunizationRecordFile: [null, Validators.required],
      criminalRecordFile: [null, Validators.required],
      firstAidOrCPRFile: [null]
    });
  }

  ngOnInit(): void {
    console.log('=== COMPLETE-PROFILE ngOnInit START ===');
    
    // التحقق من أن المستخدم لم يكمل الملف الشخصي بالفعل
    if (isPlatformBrowser(this.platformId as Object)) {
      const verificationStatus = this.authService.getVerificationStatus();
      const profileComplete = this.authService.isProfileComplete();
      const needsFreshReg = this.authService.needsFreshRegistration();
      const isAuthenticated = this.authService.isAuthenticated();
      
      console.log('Complete-profile ENTRY GUARD:', {
        isAuthenticated,
        needsFreshReg,
        verificationStatus,
        profileComplete,
        fromLogin: history.state?.fromLogin,
        freshReg: history.state?.freshRegistration
      });
      
      // BLOCK ACCESS if:
      // 1. NOT fresh registration AND profile already complete AND approved
      const shouldBlock = isAuthenticated && 
                         !needsFreshReg && 
                         profileComplete && 
                         verificationStatus === 'approved';
      
      if (shouldBlock) {
        console.log('🚫 BLOCKED: Profile already approved & complete → PSW dashboard');
        this.router.navigate(['/psw']);
        return;
      }
      
      // Allow for: fresh reg, pending, rejected, unauthenticated
      if (needsFreshReg) {
        console.log('✅ ALLOWED: Fresh registration');
      } else if (verificationStatus === 'pending') {
        console.log('✅ ALLOWED: Pending verification');
      } else if (verificationStatus === 'rejected') {
        console.log('✅ ALLOWED: Rejected - resubmit');
      } else if (!isAuthenticated) {
        console.log('✅ ALLOWED: Not authenticated');
      }
      
      // Restore flags
      const permanentFlag = localStorage.getItem('pswProfileCompletePermanent');
      if (permanentFlag === '1' && !profileComplete) {
        localStorage.setItem('pswProfileComplete', '1');
        console.log('Restored profile completion flag');
      }
    }
    console.log('=== COMPLETE-PROFILE ngOnInit END ===');
  }

  // Check if selected type needs two sides (ID or License)
  showTwoSides(): boolean {
    const type = this.form.get('proofIdentityType')?.value;
    return type === 'ID' || type === 'License';
  }

  // Called when identity type changes
  onIdentityTypeChange(): void {
    // Clear previous identity file fields when type changes
    this.form.patchValue({
      proofIdentityFile: null,
      proofIdentityFileFront: null,
      proofIdentityFileBack: null
    });
    this.selectedFileNames = {
      proofIdentityFile: '',
      proofIdentityFileFront: '',
      proofIdentityFileBack: ''
    };
    this.previews = {
      proofIdentityFile: '',
      proofIdentityFileFront: '',
      proofIdentityFileBack: ''
    };
    this.cdr.detectChanges();
  }

  onFileChange(field: string, ev: any) {
    const file = ev?.target?.files?.[0] ?? null;
    if (file) {
      this.form.patchValue({ [field]: file });
      this.selectedFileNames[field] = file.name;

      // توليد معاينة للصورة قبل الرفع
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          this.previews[field] = reader.result as string;
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
      this.cdr.detectChanges();
    }
  }

  submit() {
    this.form.markAllAsTouched();
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('User not authenticated in submit - redirecting to login');
      this.notifications.show('Please login to complete your profile', 'error');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('User is authenticated, proceeding with profile completion');
    
    // Validate based on identity type
    const isTwoSides = this.showTwoSides();
    let missing: string[] = [];
    
    if (isTwoSides) {
      // For ID or License: need front and back
      if (!this.form.get('proofIdentityFileFront')?.value) missing.push('Proof identity (Front)');
      if (!this.form.get('proofIdentityFileBack')?.value) missing.push('Proof identity (Back)');
    } else {
      // For Passport: need single file
      if (!this.form.get('proofIdentityFile')?.value) missing.push('Proof identity');
    }
    
    if (this.form.get('pswCertificateFile')?.invalid || !this.form.get('pswCertificateFile')?.value) missing.push('PSW certificate');
    if (this.form.get('cvFile')?.invalid || !this.form.get('cvFile')?.value) missing.push('CV');
    if (this.form.get('immunizationRecordFile')?.invalid || !this.form.get('immunizationRecordFile')?.value) missing.push('Immunization record');
    if (this.form.get('criminalRecordFile')?.invalid || !this.form.get('criminalRecordFile')?.value) missing.push('Criminal record');
    
    if (missing.length > 0) {
      this.notifications.show(`Please upload: ${missing.join(', ')}`, 'error');
      return;
    }
    
    this.isSubmitting = true;
    
    // Prepare form data based on identity type
    const formValue = { ...this.form.value };
    if (isTwoSides) {
      // Combine front and back into proofIdentityFile for API
      formValue.proofIdentityFile = formValue.proofIdentityFileFront;
      formValue.proofIdentityFileBack = formValue.proofIdentityFileBack;
    }
    
        this.svc.completeProfile(formValue).subscribe({
      next: (response) => {
        console.log('Profile completion response:', response);
        
        // Set completion flags immediately
        this.authService.clearNeedsProfileCompletion();
        this.authService.setProfileComplete();
        
        // Verify the flag was set
        console.log('Profile complete flag after setting:', this.authService.isProfileComplete());
        
        // Check if still authenticated
        console.log('Still authenticated after completion:', this.authService.isAuthenticated());
        
        // Try to refresh profile, but don't block navigation if it fails
        this.authService.loadUserProfile().subscribe({
          next: () => {
            console.log('Profile refreshed successfully after completion');
          },
          error: (err) => {
            console.warn('Failed to refresh profile after completion, but continuing:', err);
            // Don't block the flow - user is still authenticated
          }
        });
        
        this.notifications.show('Profile submitted successfully! You will be redirected to dashboard...', 'success');
        
        // Navigate to PSW dashboard after showing success message
        setTimeout(() => {
          console.log('Navigating to PSW dashboard...');
          this.router.navigate(['/psw']);
        }, 2000); // Increased delay to let user see the success message
      },
      error: (err: any) => {
        this.isSubmitting = false;
        console.error('Complete profile error:', err);
        
        if (err.status === 409) {
          // Profile already submitted — treat as success
          this.authService.setProfileComplete();
        // Treat 409 as success: refresh profile data
        this.authService.loadUserProfile().subscribe({
          next: () => {
            console.log('Profile refreshed after 409 success');
          },
          error: (err) => {
            console.warn('Failed to refresh profile after 409, continuing navigation:', err);
          }
        });
        this.notifications.show('Profile already submitted. Redirecting to profile...', 'success');
        setTimeout(() => this.router.navigate(['/psw/profile']), 1500);
        return;
          setTimeout(() => this.router.navigate(['/psw']), 1500);
          return;
        }
        
        if (err.status === 401) {
          this.notifications.show('Session expired. Please login again.', 'error');
          this.router.navigate(['/login']);
        } else {
          this.notifications.show(err?.error?.message || 'Upload failed', 'error');
        }
        this.cdr.detectChanges();
      }
    });
  }

  skip() { 
    // After skip, clear the needs profile completion flag and go to PSW dashboard
    this.authService.clearNeedsProfileCompletion();
    this.router.navigate(['/psw']); 
  }
}
