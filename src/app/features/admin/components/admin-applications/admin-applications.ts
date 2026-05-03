import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  clientFilterSearch,
  clientPaginate,
  clientTotalPages,
} from '../../../../core/utils/admin-client-list';

interface ApplicationItem {
  jobRequestId: string;
  pswId?: string;
  pswUserId?: string;
  offerId: string;
  pswName: string;
  pswFullName?: string;
  pswEmail?: string;
  pswPhone?: string;
  pswVerification?: string;
  pswPhotoUrl?: string;
  hourlyRate?: number;
  offerTitle: string;
  posterName?: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  appliedAt: string;
  profileLoaded?: boolean;
}

function normStatus(app: ApplicationItem): string {
  const raw = (app as unknown as Record<string, unknown>)['status'] ?? (app as unknown as Record<string, unknown>)['Status'];
  return String(raw ?? app.status ?? '').trim();
}

@Component({
  selector: 'app-admin-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-applications.html',
  styleUrls: ['./admin-applications.scss', '../../admin-common.scss'],
})
export class AdminApplications implements OnInit {
  private admin = inject(AdminService);
  private profileService = inject(ProfileService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  private allApplications: ApplicationItem[] = [];

  applications: ApplicationItem[] = [];
  isLoading = true;
  error: string | null = null;
  rejectReason = '';
  selectedRequestId: string | null = null;
  approvingId: string | null = null;
  rejectingId: string | null = null;

  searchInput = '';
  statusFilter: '' | 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled' = 'Pending';
  pageIndex = 0;
  pageSize = 12;

  lightboxUrl: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  get filteredCount(): number {
    return this.filteredAll.length;
  }

  get totalPages(): number {
    return clientTotalPages(this.filteredCount, this.pageSize);
  }

  private get filteredAll(): ApplicationItem[] {
    let list = this.allApplications;

    if (this.statusFilter) {
      const want = this.statusFilter.toLowerCase();
      list = list.filter((a) => normStatus(a).toLowerCase() === want);
    }

    return clientFilterSearch(list, this.searchInput, (a) =>
      [
        a.pswName,
        a.pswFullName || '',
        a.pswPhone || '',
        a.pswEmail || '',
        a.posterName || '',
        a.jobRequestId,
      ]
        .filter(Boolean)
        .join(' ')
    );
  }

  load(): void {
    this.isLoading = true;
    this.error = null;

    this.admin.getAdminApplicationsPaged().subscribe({
      next: ({ items }) => {
        console.log('Admin Applications loaded:', items);
        this.allApplications = (items as unknown as ApplicationItem[]) ?? [];
        this.isLoading = false;
        this.applyLocalPage();
        this.cdr.detectChanges();

        this.allApplications.forEach(app => {
          const userId = app.pswId ?? app.pswUserId;
          if (userId && !app.profileLoaded) {
            this.loadPswDetails(app);
          }
        });
      },
      error: (err) => {
        console.error('Error loading applications:', err);
        this.error = err?.error?.message || err?.message || 'Failed to load applications.';
        this.allApplications = [];
        this.applications = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyLocalPage(): void {
    const list = this.filteredAll;
    this.applications = clientPaginate(list, this.pageIndex, this.pageSize);
    if (this.pageIndex > 0 && this.applications.length === 0 && list.length > 0) {
      this.pageIndex = 0;
      this.applications = clientPaginate(list, 0, this.pageSize);
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

  applyFilters(): void {
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
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

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
  }

  displayStatus(app: ApplicationItem): string {
    return normStatus(app) || '—';
  }

  isPending(app: ApplicationItem): boolean {
    return normStatus(app).toLowerCase() === 'pending';
  }

  approve(app: ApplicationItem): void {
    if (!app.jobRequestId) {
      this.notifications.show('Missing jobRequestId.', 'error');
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(app.jobRequestId)) {
      this.notifications.show('Invalid jobRequestId format.', 'error');
      return;
    }

    this.approvingId = app.jobRequestId;

    this.admin.approveApplication(app.jobRequestId).subscribe({
      next: () => {
        this.notifications.show('Application approved & forwarded to CareHome for final review.', 'success');
        this.allApplications = this.allApplications.filter((a) => a.jobRequestId !== app.jobRequestId);
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.show(err?.error?.message || `Approve failed (Status:${err.status || 'unknown'})`, 'error');
      },
      complete: () => {
        this.approvingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  openReject(app: ApplicationItem): void {
    this.selectedRequestId = app.jobRequestId;
    this.rejectReason = '';
  }

  submitReject(): void {
    if (!this.selectedRequestId || !this.rejectReason.trim()) {
      this.notifications.show('Please enter a rejection reason.', 'error');
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.selectedRequestId)) {
      this.notifications.show('Invalid application ID.', 'error');
      return;
    }

    this.rejectingId = this.selectedRequestId;

    this.admin.rejectApplication(this.selectedRequestId, { reason: this.rejectReason.trim() }).subscribe({
      next: () => {
        this.notifications.show('Application rejected successfully.', 'success');
        this.allApplications = this.allApplications.filter((a) => a.jobRequestId !== this.selectedRequestId);
        this.selectedRequestId = null;
        this.rejectReason = '';
        this.rejectingId = null;
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.show(err?.error?.message || `Reject failed (Status:${err.status || 'unknown'})`, 'error');
        this.rejectingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  cancelReject(): void {
    this.selectedRequestId = null;
    this.rejectReason = '';
    this.rejectingId = null;
  }

  getPswName(app: ApplicationItem): string {
    return app.pswFullName || app.pswName || (app as any).psw?.fullName || '—';
  }

  getPosterName(app: ApplicationItem): string {
    return app.posterName || (app as any).posterName || '—';
  }

  getPswPhone(app: ApplicationItem): string {
    const userId = app.pswId ?? app.pswUserId;
    if (!app.profileLoaded && userId) {
      this.loadPswDetails(app);
    }
    return app.pswPhone || '—';
  }

  getVerificationStatus(app: ApplicationItem): string {
    const userId = app.pswId ?? app.pswUserId;
    if (!app.profileLoaded && userId) {
      this.loadPswDetails(app);
    }
    return app.pswVerification || '—';
  }

  private loadPswDetails(app: ApplicationItem): void {
    const userId = app.pswId ?? app.pswUserId;
    if (!userId || app.profileLoaded) return;
    app.profileLoaded = true;

    this.admin.getAdminUserProfile(userId).subscribe({
      next: (response: any) => {
        const data = response?.data ?? response;
        app.pswPhone = app.pswPhone || data?.phoneNumber || '—';
        app.pswVerification = data?.verificationStatus || '—';
        app.pswPhotoUrl = data?.profilePhoto?.url || null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load PSW profile details:', err);
      }
    });
  }

  getOfferTitle(app: ApplicationItem): string {
    return app.offerTitle || '—';
  }

  getShiftInfo(app: ApplicationItem): string {
    const shifts = (app as any).shifts as any[];
    if (shifts?.length) {
      const s = shifts[0];
      const dateStr = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      if (s.startTime && s.endTime) {
        return `${dateStr} • ${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`;
      }
      return dateStr;
    }
    return '—';
  }

  getExtraShifts(app: ApplicationItem): string[] {
    const shifts = (app as any).shifts as any[];
    if (!shifts || shifts.length <= 1) return [];
    return shifts.slice(1).map(s => {
      const dateStr = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      if (s.startTime && s.endTime) {
        return `${dateStr} • ${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`;
      }
      return dateStr;
    });
  }

  getSubmittedDate(app: ApplicationItem): string {
    if (app.appliedAt) {
      return new Date(app.appliedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '—';
  }

  isProcessing(app: ApplicationItem): boolean {
    return this.approvingId === app.jobRequestId || this.rejectingId === app.jobRequestId;
  }

  get hasAnyLoaded(): boolean {
    return this.allApplications.length > 0;
  }

  openLightbox(url: string | null | undefined): void {
    if (url) this.lightboxUrl = url;
  }

  closeLightbox(): void {
    this.lightboxUrl = null;
  }
}