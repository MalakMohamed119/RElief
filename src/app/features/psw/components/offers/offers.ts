import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PswNav } from '../../../../shared/components/psw-nav/psw-nav';
import { Footer } from '../../../../shared/components/footer/footer';
import { ToastComponent } from '../../../../shared/components/toast/toast';
import { OffersService } from '../../../../core/services/offers.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { ApplyToOfferDto } from '../../../../core/models/api.models';
import { take } from 'rxjs';

interface BrowseOffer {
  id: string;
  title: string;
  description: string;
  address: string;
  hourlyRate: number | null;
  shifts: any[];
}

interface OfferDetails extends BrowseOffer {
  careHomeName?: string;
  requirements?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-psw-offers',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe, FormsModule, PswNav, Footer, ToastComponent],
  templateUrl: './offers.html',
  styleUrl: './offers.scss',
})
export class PswOffers implements OnInit {
  private offersService = inject(OffersService);
  private notifications = inject(NotificationService);
  private profileService = inject(ProfileService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  offers: BrowseOffer[] = [];
  isLoading = true;
  error: string | null = null;

  pageIndex = 1;
  pageSize = 12;
  search = '';

  selectedOffer: OfferDetails | null = null;
  selectedShiftIds: string[] = [];
  isLoadingDetails = false;
  applyingOfferId: string | null = null;

  readonly userProfile$ = this.authService.userProfile$;

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe();
    this.loadOffers();
  }

  canApply(): boolean {
    const profile = this.authService.getUserProfile();
    const status = profile?.verificationStatus?.toString().toLowerCase();
    const isApproved = status === 'approved' || status === 'verified' || status === '2' || status === 'active' || profile?.isVerified === true;
    console.log('!!! Can Apply Check - Status is:', status, 'Result:', isApproved);
    return !!isApproved;
  }

  loadOffers(): void {
    this.isLoading = true;
    this.error = null;
    this.offersService.browseOffers({
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      search: this.search || undefined,
    }).subscribe({
      next: (response: any) => {
        console.log('PSW Browse Offers Response:', response);
        const rawData = response?.data || response?.items || response;
        this.offers = Array.isArray(rawData) ? rawData : [];
        console.log('PSW offers loaded:', this.offers.length);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ... rest of methods same as before ...
  onSearchChange(value: string): void {
    this.search = value;
    this.pageIndex = 1;
    this.loadOffers();
  }

  openDetails(offer: BrowseOffer): void {
    if (!offer?.id) return;
    
    this.authService.loadUserProfile().subscribe();
    
    this.selectedOffer = null;
    this.selectedShiftIds = [];
    this.isLoadingDetails = true;

    this.offersService.getOfferById(offer.id).subscribe({
      next: (details) => {
        this.selectedOffer = details as OfferDetails;
        this.selectedShiftIds = (this.selectedOffer.shifts || [])
          .map((s: any) => s.shiftId ?? s.ShiftId ?? s.id ?? s.Id)
          .filter((id: string | null | undefined) => !!id);
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load offer details', err);
        this.notifications.show('Failed to load offer details', 'error');
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeDetails(): void {
    this.selectedOffer = null;
    this.selectedShiftIds = [];
  }

  toggleShift(shiftId: string): void {
    const index = this.selectedShiftIds.indexOf(shiftId);
    if (index > -1) {
      this.selectedShiftIds.splice(index, 1);
    } else {
      this.selectedShiftIds.push(shiftId);
    }
  }

  isShiftSelected(shiftId: string): boolean {
    return this.selectedShiftIds.includes(shiftId);
  }

  apply(offer: BrowseOffer): void {
    if (!offer?.id) return;

    this.authService.loadUserProfile().pipe(take(1)).subscribe((profile: any) => {
      console.log('Apply check - Full Profile:', JSON.stringify(profile));
      
      // Explicitly sync profile complete state per server response
      if (profile?.isProfileCompleted === true) {
        this.authService.setProfileComplete();
      }
      
      const role = this.authService.getUserRole();
      const isPsw = role?.toLowerCase() === 'psw' || role?.toLowerCase() === 'caregiver';
      
      const profileCompleted = profile?.isProfileCompleted || profile?.profileCompleted || false;
      const verificationStatus = profile?.verificationStatus;
      
      // Diagnostic log before API call
      console.log('Applying with Profile Status:', {
        isProfileCompleted: profileCompleted,
        verificationStatus: verificationStatus,
        fullProfile: profile,
        canApply: this.canApply()
      });
      
      if (isPsw && (!profileCompleted || !this.canApply())) {
        let msg: string;
        if (!profileCompleted) {
          msg = 'You cannot apply yet. Please complete your profile information first to be eligible.';
        } else {
          msg = 'Your profile is not verified yet. You will be able to apply once approved by Admin.';
        }
        this.notifications.show(msg, 'error');
        return;
      }

      if (this.selectedOffer !== offer || this.selectedShiftIds.length === 0) {
        this.notifications.show('Please view details and select shifts first.', 'info');
        this.openDetails(offer);
        return;
      }

      this.applyingOfferId = offer.id;

      // Force final profile refresh before apply
      this.profileService.getMyProfile().pipe(take(1)).subscribe((freshProfile) => {
        console.log('Final pre-apply profile refresh:', freshProfile);
        if (freshProfile.isProfileCompleted !== true) {
          this.notifications.show('Profile still incomplete. Please update required fields.', 'error');
          this.applyingOfferId = null;
          return;
        }

        const payload: ApplyToOfferDto = {
          offerId: offer.id,
          shiftIds: this.selectedShiftIds,
        };

        this.offersService.applyToOffer(payload).subscribe({
        next: () => {
          this.notifications.show('Request sent to Care Home successfully!', 'success');
          this.applyingOfferId = null;
          this.closeDetails();
          this.loadOffers();
        },
        error: (err) => {
          console.error('Apply error', err);
          let msg = err?.error?.message || err?.message || 'Failed to send request.';
          if (err?.status === 403) {
            msg = 'Not authorized to apply.';
          } else if (err?.status === 409) {
            msg = err.error?.message || 'Already applied to these shifts.';
          }
          this.notifications.show(msg, 'error');
          this.applyingOfferId = null;
        },
      });
      });
    });
  }
}

