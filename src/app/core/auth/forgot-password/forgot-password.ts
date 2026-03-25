import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  step = 'request'; // 'request' or 'reset'
  isLoading = false;
  message = '';
  error = '';

  requestForm!: FormGroup;
  resetForm!: FormGroup;

  ngOnInit(): void {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      code: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });
  }

  hasError(form: FormGroup, controlName: string, errorName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.hasError(errorName) && (control.dirty || control.touched);
  }

  resetMismatch(): boolean {
    const p1 = this.resetForm.get('newPassword');
    const p2 = this.resetForm.get('confirmPassword');
    return !!(p1 && p2 && p1.value !== p2.value && (p1.dirty || p2.dirty));
  }

  submitRequest(): void {
    if (this.requestForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    this.authService.forgotPassword(this.requestForm.value.email).subscribe({
      next: () => {
        this.message = 'Reset instructions sent to your email.';
        this.step = 'reset';
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to send reset email.';
        this.isLoading = false;
      }
    });
  }

  submitReset(): void {
    if (this.resetForm.invalid) return;

    const { confirmPassword, ...payload } = this.resetForm.value;
    if (payload.newPassword !== this.resetForm.get('confirmPassword')?.value) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    this.authService.resetPassword(payload).subscribe({
      next: () => {
        this.notifications.show('Password reset successfully. Please log in.', 'success');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to reset password.';
        this.isLoading = false;
      }
    });
  }
}
