import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, AdminPagedResult } from '../../../../core/services/admin.service';
import { OffersService } from '../../../../core/services/offers.service';
import {
  clientFilterSearch,
  clientPaginate,
  clientTotalPages,
} from '../../../../core/utils/admin-client-list';

interface OfferItem {
  offerId?: string;
  id?: string;
  title?: string;
  position?: string;
  jobTitle?: string;
  description?: string;
  address?: string;
  address2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  posterName?: string;
  posterType?: string;
  hourlyRate?: number;
  careHomeId?: string;
  careHomeName?: string;
  shifts: ShiftItem[];
  preferences?: string[];
  createdAt?: string;
  isActive?: boolean;
}

interface ShiftItem {
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isAvailable?: boolean;
}

@Component({
  selector: 'app-admin-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-offers.html',
  styleUrls: ['./admin-offers.scss', '../../admin-common.scss'],
})
export class AdminOffers implements OnInit {
  private admin = inject(AdminService);
  private offersService = inject(OffersService);
  private cdr = inject(ChangeDetectorRef);

  private allOffers: OfferItem[] = [];

  offers: OfferItem[] = [];
  isLoading = true;
  error: string | null = null;

  searchInput = '';
  pageIndex = 0;
  pageSize = 12;

  ngOnInit(): void {
    this.load();
  }

  get filteredCount(): number {
    return this.filteredAll.length;
  }

  get totalPages(): number {
    return clientTotalPages(this.filteredCount, this.pageSize);
  }

  private get filteredAll(): OfferItem[] {
    return clientFilterSearch(this.allOffers, this.searchInput, (o) =>
      [
        o.title || o.jobTitle || o.position || '',
        o.description || '',
        o.address || o.city || o.province || '',
        o.posterName || o.careHomeName || '',
      ]
        .filter(Boolean)
        .join(' ')
    );
  }

  load(): void {
    this.isLoading = true;
    this.error = null;

    this.admin.getAdminOffersPaged(1, 1000).subscribe({
      next: (result: AdminPagedResult) => {
        this.allOffers = (result.items as any[]).map(item => ({
          ...item,
          posterName: item.posterName || item.careHomeName,
          posterType: item.posterType || 'Care Home',
          position: item.position || item.jobTitle,
        }));
        this.isLoading = false;
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyLocalPage(): void {
    const list = this.filteredAll;
    this.offers = clientPaginate(list, this.pageIndex, this.pageSize);
    if (this.pageIndex > 0 && this.offers.length === 0 && list.length > 0) {
      this.pageIndex = 0;
      this.offers = clientPaginate(list, 0, this.pageSize);
    }
  }

  private searchTimeout: any;

  onSearch(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.pageIndex = 0;
      this.applyLocalPage();
      this.cdr.detectChanges();
    }, 250);
  }

  goPrev(): void {
    if (this.pageIndex > 0) {
      this.pageIndex--;
      this.applyLocalPage();
      this.cdr.detectChanges();
    }
  }

  goNext(): void {
    if (this.pageIndex < this.totalPages - 1) {
      this.pageIndex++;
      this.applyLocalPage();
      this.cdr.detectChanges();
    }
  }

  onPageSizeChange(value: any): void {
    this.pageSize = +value;
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
  }

  get hasAnyLoaded(): boolean {
    return this.allOffers.length > 0;
  }

  getTitle(offer: OfferItem): string {
    return offer.title || offer.jobTitle || 'Untitled Offer';
  }

  getPosition(offer: OfferItem): string {
    return offer.position || offer.jobTitle || '';
  }

getPosterInfo(offer: OfferItem): string {
    const name = offer.posterName || offer.careHomeName || 'N/A';
    return name;
  }

  getAvailabilityStatus(offer: any): { available: number; booked: number } {
    const shifts = offer.shifts || [];
    const available = shifts.filter((s: any) => s.isAvailable).length;
    const booked = shifts.filter((s: any) => !s.isAvailable).length;
    return { available, booked };
  }

  getTruncatedDescription(offer: OfferItem): string {
    const desc = offer.description || '';
    return desc.length > 100 ? desc.slice(0, 100) + '...' : desc || 'No description';
  }

  getFullAddress(offer: OfferItem): string {
    const parts = [offer.address, offer.address2, offer.city, offer.province, offer.postalCode].filter(Boolean);
    return parts.join(', ') || 'Address not specified';
  }

  getAddress(offer: OfferItem): string {
    const parts = [offer.address, offer.city, offer.province, offer.postalCode]
      .filter(p => p && String(p).trim());
    return parts.join(', ') || 'N/A';
  }

  getCareHomeName(offer: OfferItem): string {
    return offer.careHomeName || offer.posterName || 'N/A';
  }

  getHourlyRate(offer: OfferItem): string {
    const rate = offer.hourlyRate || 0;
    return rate > 0 ? `£${rate}/hr` : 'N/A';
  }

  getShiftCount(offer: OfferItem): number {
    return offer.shifts?.length ?? 0;
  }

  getShiftDates(offer: OfferItem): string {
    if (!offer.shifts || offer.shifts.length === 0) return 'No shifts';

    const dates = offer.shifts.slice(0, 3).map((s) => {
      const date = new Date(s.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      const time = `${s.startTime} - ${s.endTime}`;
      const status = (s.isAvailable ?? !s.isBooked) ? 'Available' : 'Booked';
      return `${date} ${time} (${status})`;
    });

    if (offer.shifts.length > 3) {
      return `${dates.join(', ')} +${offer.shifts.length - 3} more`;
    }
    return dates.join(', ');
  }

  getShiftsSummary(offer: OfferItem): string {
    const count = this.getShiftCount(offer);
    return count === 0 ? 'No shifts' : `${count} shift${count > 1 ? 's' : ''}`;
  }

  getShiftSummary(offer: OfferItem): string {
    return this.getShiftsSummary(offer);
  }

  getPreferences(offer: OfferItem): string[] {
    return offer.preferences || [];
  }

  getStatus(offer: OfferItem): string {
    return (offer.isActive ?? false) ? 'Active' : 'Inactive';
  }
}

