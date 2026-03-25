import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { Footer } from '../../../../shared/components/footer/footer';
import { OffersService } from '../../../../core/services/offers.service';

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

  private offersService = inject(OffersService);
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
    // Navigate to edit offer page or open edit modal
    console.log('Edit offer:', offer.id);
    // Could implement: this.router.navigate(['/care-home/edit-offer', offer.id]);
  }

  viewApplications(offer: OfferItem): void {
    // Navigate to applications page for this offer
    console.log('View applications for offer:', offer.id);
    // Could implement: this.router.navigate(['/care-home/applications'], { queryParams: { offerId: offer.id } });
  }
}

