import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { Footer } from '../../../../shared/components/footer/footer';
import { OffersService } from '../../../../core/services/offers.service';
import { ApplicationsService } from '../../../../core/services/applications.service';

interface OfferItem {
  id: string;
  title: string;
  description: string;
  address: string;
  hourlyRate: number | null;
  shifts: ShiftItem[];
  isActive: boolean;
  createdAt?: string;
}

interface ShiftItem {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

interface Applicant {
  id: string;
  fullName: string;
  profilePhoto?: { url: string; id: string; fileName: string } | null;
  statusCode: number;
  status: string;
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterModule, Navbar, Footer],
  templateUrl: './offers.html',
  styleUrls: ['./offers.scss'],
})
export class Offers implements OnInit {
  offers: OfferItem[] = [];
  loading = true;
  error: string | null = null;

  // Applicants Modal
  selectedOfferId: string | null = null;
  applicants: Applicant[] = [];
  applicantsLoading = false;

  private offersService = inject(OffersService);
  private applicationsService = inject(ApplicationsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    this.offersService.getOffers().subscribe({
      next: (list) => {
        this.offers = list ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.error = err?.error?.message || err?.message || 'Failed to load offers.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  goToCreateOffer(): void {
    this.router.navigate(['/care-home'], { fragment: 'request-form' });
  }

  getTitle(offer: OfferItem): string {
    return offer.title || 'Untitled Offer';
  }

  getAddress(offer: OfferItem): string {
    return offer.address || 'No address provided';
  }

  getStatus(offer: OfferItem): string {
    return offer.isActive !== false ? 'Active' : 'Inactive';
  }

  getShiftCount(offer: OfferItem): number {
    return offer.shifts?.length ?? 0;
  }

  getShiftDates(offer: OfferItem): string {
    if (!offer.shifts || offer.shifts.length === 0) return 'No shifts';
    
    const dates = offer.shifts.slice(0, 3).map(s => 
      new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );
    
    if (offer.shifts.length > 3) {
      return dates.join(', ') + ` +${offer.shifts.length - 3} more`;
    }
    return dates.join(', ');
  }

  editOffer(offer: OfferItem): void {
    console.log('Edit offer:', offer.id);
  }

  async viewApplications(offer: OfferItem): Promise<void> {
    if (!offer.id) return;
    
    this.selectedOfferId = offer.id;
    this.applicantsLoading = true;
    this.applicants = [];
    
    this.applicationsService.getApplicationsForOffer(offer.id).subscribe({
      next: (apps) => {
        this.applicants = apps.map((app: any) => ({
          id: app.pswUserId || app.id,
          fullName: app.fullName || app.name || 'Unknown',
          profilePhoto: app.profilePhoto,
          statusCode: app.statusCode || 1,
          status: app.status || 'Pending'
        }));
        this.applicantsLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading applicants:', err);
        this.error = 'Failed to load applicants.';
        this.applicants = [];
        this.applicantsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeApplicantsModal(): void {
    this.selectedOfferId = null;
    this.applicants = [];
    this.applicantsLoading = false;
  }

  getStatusClass(statusCode: number): string {
    if (statusCode === 1) return 'pending';
    if (statusCode === 2) return 'accepted';
    if (statusCode === 3) return 'rejected';
    return 'unknown';
  }

  getApplicantPhotoUrl(applicant: Applicant): string | null {
    return applicant.profilePhoto?.url || null;
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  get selectedOfferTitle(): string {
    return this.offers.find(o => o.id === this.selectedOfferId)?.title || '';
  }
}


