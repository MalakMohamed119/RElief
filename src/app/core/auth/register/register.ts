import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';
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

  private buildForm(mode: 'psw' | 'carehome-individual' | 'carehome-multiple'): FormGroup {
    const passwordValidators = [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
    ];

    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]{10,}$/)]],
      dateOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      businessLicense: [''],
      legalName: [''],
      password: ['', passwordValidators],
      confirmPassword: ['', Validators.required],
      address: this.fb.group({
        apartmentNumber: [0, Validators.required],
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['', Validators.required]
      })
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.registerForm.get(controlName);
    return control
      ? control.hasError(errorName) && (control.dirty || control.touched)
      : false;
  }

  hasAddressError(fieldName: string, errorName: string): boolean {
    const addressControl = this.registerForm.get('address') as FormGroup;
    const fieldControl = addressControl?.get(fieldName);
    return fieldControl
      ? fieldControl.hasError(errorName) && (fieldControl.dirty || fieldControl.touched)
      : false;
  }

  switchMode(mode: 'psw' | 'carehome-individual' | 'carehome-multiple'): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.registerForm = this.buildForm(mode);

    // Mode-specific defaults
    if (this.currentMode === 'psw') {
      this.registerForm.patchValue({
        businessLicense: '',
        legalName: ''
      });
    } else {
      // Carehome defaults
      const legalName = this.registerForm.value.firstName + ' ' + this.registerForm.value.lastName;
      this.registerForm.patchValue({
        legalName,
        dateOfBirth: '1900-01-01'
      });
    }
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword' = 'password'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    console.log('Form valid?', this.registerForm.valid, 'Value:', this.registerForm.value);
    
    if (this.registerForm.invalid || !this.currentMode) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    
    // Create exact DTO payload
    const formValue = structuredClone(this.registerForm.value);
    const payload = {
      ...formValue,
      dateOfBirth: new Date(formValue.dateOfBirth).toISOString(),
      // Ensure apartmentNumber is number
      address: {
        ...formValue.address,
        apartmentNumber: Number(formValue.address.apartmentNumber) || 0
      }
    };
    delete payload.confirmPassword; // Not in DTO

    let typePath: string;
    switch (this.currentMode) {
      case 'psw':
        typePath = 'psw';
        break;
      case 'carehome-individual':
        typePath = 'individual';
        break;
      case 'carehome-multiple':
        typePath = 'carehome';
        break;
    }

    console.log('✅ Register payload:', payload, 'type:', typePath);

    this.authService.register(payload, typePath).pipe(first()).subscribe({
      next: (res) => {
        if (this.authService.isAuthenticated()) {
          this.authService.setNeedsProfileCompletion();
          if (this.currentMode === 'psw') {
            this.notification.show('Registration successful! Redirecting...', 'success', 3000);
            setTimeout(() => this.router.navigate(['/login']), 2000);
          } else {
            this.router.navigate(['/carehome/complete-profile']);
          }
        } else {
          this.notification.show('Registration successful! Please login.', 'success', 3000);
          setTimeout(() => this.router.navigate(['/login']), 2000);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Registration failed:', err);
        let message = 'Registration failed. Please try again.';
        if (err.status === 409) {
          message = `Email already registered. Please login.`;
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else if (err.status === 400) {
          message = err.error?.message || message;
        }
        this.notification.show(message, 'error', 5000);
        this.isLoading = false;
      }
    });
  }
}

