import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PswNav } from '../../../../shared/components/psw-nav/psw-nav';
import { Footer } from '../../../../shared/components/footer/footer';
import { ToastComponent } from '../../../../shared/components/toast/toast';
import { OffersService } from '../../../../core/services/offers.service';
import { PswApplicationsService } from '../../../../core/services/psw-applications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { ApplyToOfferDto } from '../../../../core/models/api.models';
import { forkJoin, map, take } from 'rxjs';

interface BrowseOffer {
  id: string;
  title: string;
  description: string;
  address: string;
  hourlyRate: number | null;
  shifts: any[];
  applicationStatus?: string | null;
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
  private pswApplicationsService = inject(PswApplicationsService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  offers: BrowseOffer[] = [];
  availableOffers: BrowseOffer[] = [];
  myApplications: any[] = [];
  isLoading = true;
  loadingAvailability = false;
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
    this.loadOffersWithApplications();
  }

  loadOffersWithApplications(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      offers: this.offersService.browseOffers({
        pageIndex: this.pageIndex,
        pageSize: this.pageSize,
        search: this.search || undefined,
      }),
      applications: this.pswApplicationsService.getPswApplications()
    }).subscribe({
      next: ({ offers: rawOffers, applications }) => {
        // Build status map: offerId -> status
        const statusMap = new Map<string, string>();
        applications.forEach((app: any) => {
          if (app.offerId) {
            statusMap.set(app.offerId, app.status);
          }
        });

        console.log('=== DEBUG: Full statusMap ===', Object.fromEntries(statusMap));
        console.log('=== DEBUG: Each offer applicationStatus ===');
        
        // فلتر: شيل بس المرفوض، خلي الباقي كله
        this.offers = rawOffers.map((offer: any) => {
          const status = statusMap.get(offer.id) ?? null;
          console.log(`Offer ${offer.id}: "${status}"`);
          return { ...offer, applicationStatus: status };
        }).filter((offer: any) => {
          const s = offer.applicationStatus;
          return s !== 'RejectedByAdmin' && 
                 s !== 'RejectedByCareHome' && 
                 s !== 'Pending' &&
                 s !== 'Canceled';
        });

        
        console.log('=== DEBUG: Final filtered offers with status ===', this.offers);


        this.myApplications = applications;
        this.filterAvailableOffers();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading offers/applications:', err);
        this.error = 'Failed to load offers. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  canApply(): boolean {
    const profile = this.authService.getUserProfile() ?? null;
    const hasFiles = !!(profile?.pswCertificateFile && profile?.cvFile);
    const status = profile?.verificationStatus?.toLowerCase();
    return hasFiles && status === 'approved';
  }

  filterAvailableOffers(): void {
    if (this.offers.length === 0) {
      this.availableOffers = [];
      this.loadingAvailability = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadingAvailability = true;
    const detailRequests = this.offers.map((offer: any) =>
      this.offersService.getOfferById(offer.id).pipe(
        map((details: any) => ({
          offer,
          hasShifts: (details.shifts || []).some((s: any) => s.isAvailable !== false)
        }))
      )
    );

    forkJoin(detailRequests).subscribe({
      next: (results: any[]) => {
        this.availableOffers = results
          .filter(r => r.hasShifts)
          .map(r => ({ ...r.offer, applicationStatus: r.offer.applicationStatus } as BrowseOffer));

        this.loadingAvailability = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.availableOffers = [...this.offers];
        this.loadingAvailability = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.pageIndex = 1;
    this.offers = [];
    this.availableOffers = [];
    this.loadOffersWithApplications();
  }

  openDetails(offer: BrowseOffer): void {
    if (!offer?.id) return;

    this.selectedOffer = null;
    this.selectedShiftIds = [];
    this.isLoadingDetails = true;

    this.offersService.getOfferById(offer.id).subscribe({
      next: (details: any) => {
        this.selectedOffer = {
          ...details,
          applicationStatus: offer.applicationStatus ?? null
        } as OfferDetails;

        this.selectedShiftIds = (this.selectedOffer.shifts || [])
          .filter((s: any) => s.isAvailable !== false)
          .map((s: any) => s.shiftId ?? s.ShiftId ?? s.id ?? s.Id)
          .filter((id: any) => !!id);

        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
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

  isAlreadyApplied(offer: BrowseOffer | OfferDetails): boolean {
    const status = (offer as any).applicationStatus;
    return !!(status && ['QualifiedByAdmin', 'Accepted'].includes(status));
  }

  apply(offer: BrowseOffer | OfferDetails): void {
    if (this.isAlreadyApplied(offer)) {
      this.notifications.show('You have already applied to this offer.', 'info');
      return;
    }

    if (!offer?.id) return;

    // لو الـ modal مش مفتوح على نفس الـ offer أو مفيش shifts محددة
    if (!this.selectedOffer || this.selectedOffer.id !== offer.id || this.selectedShiftIds.length === 0) {
      this.openDetails(offer as BrowseOffer);
      return;
    }

    this.authService.loadUserProfile().pipe(take(1)).subscribe((profile: any) => {
      const hasFiles = !!(profile?.pswCertificateFile && profile?.cvFile);
      const status = profile?.verificationStatus?.toLowerCase();

      if (!hasFiles) {
        this.notifications.show('Please complete your profile to apply.', 'error');
        return;
      }

      if (status === 'none' || status === 'pending') {
        this.notifications.show('Your profile is under review. You can apply once approved.', 'error');
        return;
      }

      if (status === 'rejected') {
        this.notifications.show('Your profile was rejected. Please resubmit your documents.', 'error');
        return;
      }

      if (status !== 'approved') {
        this.notifications.show('Profile verification required before applying.', 'error');
        return;
      }

      this.applyingOfferId = offer.id;

      const payload: ApplyToOfferDto = {
        offerId: offer.id,
        shiftIds: this.selectedShiftIds,
      };

      this.offersService.applyToOffer(payload).subscribe({
        next: () => {
          // تحديث محلي فوري بدون reload
          const updateStatus = (list: BrowseOffer[]) => {
            const idx = list.findIndex(o => o.id === offer.id);
            if (idx > -1) list[idx] = { ...list[idx], applicationStatus: 'QualifiedByAdmin' };
          };
          updateStatus(this.offers);
          updateStatus(this.availableOffers);

          this.applyingOfferId = null;
          this.closeDetails();
          this.cdr.detectChanges();

          setTimeout(() => {
            this.notifications.show('Application sent successfully!', 'success');
            this.cdr.detectChanges();
          }, 50);
        },
        error: (err: any) => {
          console.error('Apply error', err);
          let msg = err?.error?.message || err?.message || 'Failed to send request.';
          if (err?.status === 403) msg = 'Not authorized to apply.';
          else if (err?.status === 409) msg = err.error?.message || 'Already applied to these shifts.';
          this.notifications.show(msg, 'error');
          this.applyingOfferId = null;
          this.cdr.detectChanges();
        }
      });
    });
  }

  getStatusClass(statusCode: number | undefined): string {
    if (!statusCode) return 'unknown';
    const code = Number(statusCode);
    if (code === 1) return 'pending';
    if (code === 2) return 'accepted';
    if (code === 3) return 'rejected';
    return 'unknown';
  }

  getStatusText(statusCode: number | undefined): string {
    if (!statusCode) return 'Unknown';
    const code = Number(statusCode);
    if (code === 1) return 'Pending';
    if (code === 2) return 'Accepted';
    if (code === 3) return 'Rejected';
    return 'Unknown';
  }
}