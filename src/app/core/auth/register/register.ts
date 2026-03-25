import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private notification = inject(NotificationService);

  registerForm: FormGroup = this.fb.group({});
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  currentMode: 'psw' | 'carehome-individual' | 'carehome-multiple' = 'psw';

  ngOnInit(): void {
    this.registerForm = this.buildForm(this.currentMode);
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  private buildForm(
    mode: 'psw' | 'carehome-individual' | 'carehome-multiple'
  ): FormGroup {
    const passwordValidators = [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
    ];

    if (mode === 'psw') {
      return this.fb.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phoneNumber: ['', [Validators.required]],
        dateOfBirth: ['', Validators.required],
        gender: ['', Validators.required],
        apartmentNumber: ['', Validators.required],
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['', Validators.required],
        password: ['', passwordValidators],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordMatchValidator });
    }

    // CareHome forms
    if (mode === 'carehome-individual') {
      return this.fb.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        businessLicense: [''],
        legalName: [''],
        phone: ['', [Validators.required]],
        gender: ['', Validators.required],
        apartment: ['', Validators.required],
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['', Validators.required],
        accountEmail: ['', [Validators.required, Validators.email]],
        password: ['', passwordValidators],
        confirmPassword: ['', Validators.required]
      }, { validators: this.passwordMatchValidator });
    }

    return this.fb.group({
      businessLicenseNumber: ['', Validators.required],
      legalEntityName: ['', Validators.required],
      legalEntityAddress: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      postalCode: ['', Validators.required],
      country: ['', Validators.required],
      houseNumber: ['', Validators.required],
      postcode: ['', Validators.required],
      covidVaccinationRequired: [false],
      fluVaccinationRequired: [false],
      contactFirstName: ['', [Validators.required, Validators.minLength(2)]],
      contactLastName: ['', [Validators.required, Validators.minLength(2)]],
      contactPhone: ['', [Validators.required]],
      accountEmail: ['', [Validators.required, Validators.email]],
      password: ['', passwordValidators],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.registerForm.get(controlName);
    return control
      ? control.hasError(errorName) && (control.dirty || control.touched)
      : false;
  }

  switchMode(mode: 'psw' | 'carehome-individual' | 'carehome-multiple'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.registerForm = this.buildForm(mode);
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword' = 'password'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    if (this.registerForm.invalid || !this.currentMode) {
      this.registerForm.markAllAsTouched();
      
      // Focus on the first invalid field
      const firstInvalidControl = Object.keys(this.registerForm.controls).find(
        key => this.registerForm.get(key)?.invalid
      );
      if (firstInvalidControl) {
        console.log(`Invalid field: ${firstInvalidControl}`);
      }
      
      return;
    }

    // Additional validation for PSW email
    if (this.currentMode === 'psw') {
      const emailControl = this.registerForm.get('email');
      const email = emailControl?.value;
      
      if (!email || !email.includes('@')) {
        this.notification.show('Please enter a valid email address.', 'error', 3000);
        return;
      }
    }

    this.isLoading = true;
    const data = this.registerForm.value;
    let payload: any;
    let typePath: string;

    if (this.currentMode === 'psw') {
      payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        dateOfBirth: new Date(data.dateOfBirth).toISOString(),
        gender: data.gender,
        address: {
          apartmentNumber: Number(data.apartmentNumber) || 0,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        }
      };
      typePath = 'psw';
    } else if (this.currentMode === 'carehome-individual') {
      payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        businessLicense: data.businessLicense || '',
        legalName: data.legalName || `${data.firstName} ${data.lastName}`,
        email: data.accountEmail,
        password: data.password,
        phoneNumber: data.phone,
        dateOfBirth: new Date().toISOString(),
        gender: data.gender,
        address: {
          apartmentNumber: Number(data.apartment) || 0,
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country
        }
      };
      typePath = 'individual';
    } else {
      payload = data;
      typePath = 'carehome';
    }

    console.log('Register payload:', payload, 'type:', typePath);

    this.authService.register(payload, typePath).pipe(first()).subscribe({
      next: (res) => {
        console.log('Registration successful:', res);
        
        // Check if user is authenticated after registration
        if (this.authService.isAuthenticated()) {
          console.log('User auto-authenticated after registration');
          // Auto-login successful - set needs profile completion
          this.authService.setNeedsProfileCompletion();
          
          // Verify the flag was set
          console.log('Profile completion flag set. Current value:', this.authService.getNeedsProfileCompletion());
          
          // For PSW: redirect to login first, then login will redirect to complete profile
          if (this.currentMode === 'psw') {
            this.notification.show('Registration successful! Redirecting to login...', 'success', 3000);
            setTimeout(() => {
              console.log('Redirecting to login page...');
              this.router.navigate(['/login']);
            }, 2000);
          } else if (this.currentMode === 'carehome-individual' || this.currentMode === 'carehome-multiple') {
            this.router.navigate(['/carehome/complete-profile']);
          } else {
            this.router.navigate(['/login']);
          }
        } else {
          console.log('No auto-login - redirecting to login page');
          // No token in response - user needs to login manually
          this.notification.show('Registration successful! Please login to continue.', 'success', 3000);
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Registration failed:', err);
        console.error('Error details:', {
          status: err?.status,
          statusText: err?.statusText,
          message: err?.error?.message,
          url: err?.url
        });
        
        if (err?.status === 409) {
          // Email already exists - show more detailed message and redirect to login
          const email = this.registerForm.get('email')?.value;
          console.log('Email already exists:', email);
          
          this.notification.show(
            `This email (${email}) is already registered. Please login instead or use a different email.`, 
            'error', 
            6000
          );
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (err?.status === 400) {
          // Bad request - validation errors
          const errorMessage = err?.error?.message || 'Please check your input and try again.';
          this.notification.show(errorMessage, 'error', 5000);
        } else if (err?.status === 500) {
          // Server error
          this.notification.show('Server error. Please try again later.', 'error', 5000);
        } else {
          // Generic error
          const errorMessage = err?.error?.message || 'Registration failed. Please try again.';
          this.notification.show(errorMessage, 'error', 5000);
        }
        
        this.isLoading = false;
      }
    });
  }
}
