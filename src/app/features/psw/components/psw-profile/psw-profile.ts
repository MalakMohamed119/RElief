import { Component, OnInit, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PswNav } from "../../../../shared/components/psw-nav/psw-nav";
import { Footer } from "../../../../shared/components/footer/footer";
import { ToastComponent } from "../../../../shared/components/toast/toast";
import { ProfileService } from '../../../../core/services/profile.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  profileImage: string | null;
}

@Component({
  selector: 'app-psw-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule, 
    PswNav, 
    Footer,
    ToastComponent
  ],
  templateUrl: './psw-profile.html',
  styleUrls: ['./psw-profile.scss']
})
export class PswProfile implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);

  profile: ProfileInfo = {
    name: '',
    email: '',
    phone: '',
    location: '',
    joinDate: 'Active User',
    profileImage: null
  };

  isLoading = true;
  isSaving = false;
  verificationStatus: string | null = null;
  isProfileComplete = false;
  isVerified = false;
  rejectionReason: string | null = null;

  editModel = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: {
      apartmentNumber: 0,
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  };

  private profileSub?: Subscription;

  ngOnInit(): void {
    this.loadProfile();
    this.profileSub = this.authService.userProfile$.subscribe(profile => {
      if (profile) {
        console.log('Profile subscription update:', profile);
        this.verificationStatus = profile.verificationStatus || 'None';
        this.rejectionReason = profile.rejectionReason || null;
        this.isProfileComplete = !!profile.isProfileCompleted;
        this.isVerified = this.verificationStatus === 'Approved';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authService.loadUserProfile().subscribe({
      next: () => {
        this.profileService.getMyProfile().subscribe({
          next: (p) => {
            const address = p.address ? `${p.address.street}, ${p.address.city}, ${p.address.country}` : '';
            this.profile = {
              name: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Profile',
              email: p.email ?? '',
              phone: p.phoneNumber ?? '',
              location: address,
              joinDate: 'Active User',
              profileImage: p.profilePhoto?.url || null
            };
            this.editModel = {
              firstName: p.firstName ?? '',
              lastName: p.lastName ?? '',
              phoneNumber: p.phoneNumber ?? '',
              address: {
                apartmentNumber: p.address?.apartmentNumber ?? 0,
                street: p.address?.street ?? '',
                city: p.address?.city ?? '',
                state: p.address?.state ?? '',
                postalCode: p.address?.postalCode ?? '',
                country: p.address?.country ?? ''
              }
            };
            this.verificationStatus = p.verificationStatus || 'None';
            // Normalize verification status to handle case sensitivity
            if (this.verificationStatus) {
              this.verificationStatus = this.verificationStatus.charAt(0).toUpperCase() + this.verificationStatus.slice(1).toLowerCase();
            }
            this.isProfileComplete = !!p.isProfileCompleted;
            this.isVerified = p.verificationStatus === 'Approved';
            this.rejectionReason = p.rejectionReason || null;
            
            console.log('PSW Profile Status:', {
              verificationStatus: this.verificationStatus,
              rejectionReason: this.rejectionReason,
              isProfileComplete: this.isProfileComplete,
              isVerified: this.isVerified,
              serverData: p
            });
            
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Profile load error:', err);
            this.notifications.show('Failed to load profile.', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Auth profile load error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.profileService.updateMyProfile(this.editModel).subscribe({
      next: () => {
        this.notifications.show('Profile updated successfully.', 'success');
        this.authService.setProfileComplete();
        this.isSaving = false;
        this.loadProfile();
      },
      error: (err) => {
        console.error('Save error:', err);
        this.notifications.show('Failed to update profile.', 'error');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.profileService.uploadPhoto(file).subscribe({
      next: () => {
        this.notifications.show('Profile photo updated.', 'success');
        this.loadProfile();
      },
      error: (err) => {
        console.error('Photo upload failed', err);
        this.notifications.show('Failed to upload photo.', 'error');
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getVerificationLabel(): string {
    if (this.isVerified) return 'Verified PSW';
    if (this.verificationStatus === 'pending') return 'Pending Verification';
    if (this.verificationStatus === 'rejected') return 'Verification Rejected';
    return 'Not Verified';
  }

  getVerificationClass(): string {
    if (this.isVerified) return 'verified';
    if (this.verificationStatus === 'pending') return 'pending';
    if (this.verificationStatus === 'rejected') return 'rejected';
    return 'not-verified';
  }
}

