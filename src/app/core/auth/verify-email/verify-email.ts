import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-email.html',
  styleUrls: ['../login/login.scss'],
})
export class VerifyEmailComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private profile = inject(ProfileService);
  private router = inject(Router);

  isLoading = false;
  resendLoading = false;
  message = '';
  error = '';

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  submit(): void {
    this.message = '';
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const email = this.form.get('email')?.value?.trim();
    const code = String(this.form.get('code')?.value ?? '').trim();
    this.auth.verifyEmail({ email, code }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.message = 'Email verified. Redirecting…';
        const role = (res.role ?? '').toLowerCase();
        if (role === 'psw' || role === 'caregiver') {
          this.profile.getMyProfile().subscribe({
            next: () => this.navigateByRole(role),
            error: () => this.navigateByRole(role),
          });
        } else {
          this.navigateByRole(role);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error =
          err?.error?.message || 'Verification failed. Check your code and try again.';
      },
    });
  }

  resend(): void {
    this.message = '';
    this.error = '';
    const email = this.form.get('email')?.value?.trim();
    if (!email || this.form.get('email')?.invalid) {
      this.form.get('email')?.markAsTouched();
      this.error = 'Enter a valid email to resend the code.';
      return;
    }
    this.resendLoading = true;
    this.auth.resendVerification({ email }).subscribe({
      next: (r) => {
        this.resendLoading = false;
        this.message = r.message || 'If an account exists, a new code was sent.';
      },
      error: (err) => {
        this.resendLoading = false;
        this.error = err?.error?.message || 'Could not resend code.';
      },
    });
  }

  private navigateByRole(role: string): void {
    if (role === 'admin') {
      this.router.navigate(['/admin/dashboard']);
    } else if (role === 'carehome' || role === 'individual') {
      this.router.navigate(['/care-home']);
    } else {
      this.router.navigate(['/psw']);
    }
  }

  hasError(name: string, err: string): boolean {
    const c = this.form.get(name);
    return !!c && c.hasError(err) && (c.dirty || c.touched);
  }
}
