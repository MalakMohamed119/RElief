import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { Footer } from '../../../../shared/components/footer/footer';
import { ApplicationsService } from '../../../../core/services/applications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProfileService } from '../../../../core/services/profile.service';

interface ShiftItem {
  jobRequestItemId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Application {
  jobRequestId: string;
  appliedAt: string;
  psw: {
    pswId: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    age: number;
    verificationStatus: string;
  };
  shifts: ShiftItem[];
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer, RouterModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications implements OnInit {
  applications: Application[] = [];
  loading = true;
  error: string | null = null;
  acceptingId: string | null = null;
  rejectingId: string | null = null;
  currentOfferId: string | null = null;
  activeTab: 'pending' | 'accepted' | 'rejected' = 'pending';

  showRejectModal = false;
  rejectReason = '';
  selectedApp: Application | null = null;

  selectedPsw: any = null;
  showProfileModal = false;

  constructor(
    private applicationsService: ApplicationsService,
    private notificationService: NotificationService,
    private profileService: ProfileService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.currentOfferId = params['offerId'] || null;
      this.loadApplications();
    });
  }

  private isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }

  loadApplications(): void {
    this.loading = true;
    this.error = null;

    const fetch$ = (this.currentOfferId && this.isValidUUID(this.currentOfferId))
      ? this.applicationsService.getApplicationsForOffer(this.currentOfferId)
      : this.applicationsService.getAllApplications();

    fetch$.subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        this.applications = raw as Application[];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading applications:', err);
        this.error = 'Failed to load applications.';
        this.applications = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  getPendingApplications(): Application[] {
    return this.applications.filter(app =>
      app.shifts?.some(s => s.status === 'QualifiedByAdmin')
    );
  }

  getAcceptedApplications(): Application[] {
    return this.applications.filter(app =>
      app.shifts?.some(s => s.status === 'Accepted')
    );
  }

  getRejectedApplications(): Application[] {
    return this.applications.filter(app =>
      app.shifts?.some(s => s.status === 'RejectedByCareHome' || s.status === 'RejectedByAdmin')
    );
  }


  getPendingCount(): number {
    return this.getPendingApplications().length;
  }

  getRejectedCount(): number {
    return this.getRejectedApplications().length;
  }

  getAcceptedCount(): number {
    return this.getAcceptedApplications().length;
  }


  // ── Helpers ────────────────────────────────────────────────────────────────

  getFirstShift(app: Application): ShiftItem | null {
    return app.shifts?.[0] ?? null;
  }

  getPswName(app: Application): string {
    return app?.psw?.fullName || 'Unknown PSW';
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch { return dateStr; }
  }

  formatTime(timeStr: string | null | undefined): string {
    return timeStr ? String(timeStr).substring(0, 5) : '--:--';
  }

  isProcessing(app: Application): boolean {
    const shift = this.getFirstShift(app);
    return this.acceptingId === shift?.jobRequestItemId ||
           this.rejectingId === shift?.jobRequestItemId;
  }

  // ── Accept ─────────────────────────────────────────────────────────────────

  acceptRequest(app: Application): void {
    const shift = this.getFirstShift(app);
    if (!shift) { this.notificationService.show('No shift found.', 'error'); return; }

    const { jobRequestItemId, shiftId } = shift;
    if (!this.isValidUUID(jobRequestItemId) || !this.isValidUUID(shiftId)) {
      this.notificationService.show('Invalid shift data.', 'error');
      return;
    }

    this.acceptingId = jobRequestItemId;
    this.applicationsService.acceptShift({ shiftId, jobRequestItemId }).subscribe({
      next: () => {
        this.notificationService.show('Application accepted!', 'success');
        shift.status = 'Accepted';
        this.acceptingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notificationService.show(err?.error?.message || 'Accept failed', 'error');
        this.acceptingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Reject ─────────────────────────────────────────────────────────────────

  openRejectModal(app: Application): void {
    this.selectedApp = app;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
    this.selectedApp = null;
  }

  confirmReject(): void {
    if (!this.selectedApp || !this.rejectReason.trim()) {
      this.notificationService.show('Enter rejection reason', 'error');
      return;
    }

    const shift = this.getFirstShift(this.selectedApp);
    if (!shift || !this.isValidUUID(shift.jobRequestItemId)) {
      this.notificationService.show('Invalid shift data.', 'error');
      return;
    }

    this.rejectingId = shift.jobRequestItemId;
    this.applicationsService.rejectShift({ jobRequestItemId: shift.jobRequestItemId }).subscribe({
      next: () => {
        this.notificationService.show('Application rejected.', 'success');
        shift.status = 'Rejected';
        this.rejectingId = null;
        this.closeRejectModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notificationService.show(err?.error?.message || 'Reject failed', 'error');
        this.rejectingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Profile Modal ──────────────────────────────────────────────────────────

  viewProfile(pswId: string): void {
    if (!pswId) return;
    this.profileService.getProfileById(pswId).subscribe({
      next: (data) => {
        this.selectedPsw = data;
        this.showProfileModal = true;
        this.cdr.detectChanges();
      },
      error: () => this.notificationService.show('Failed to load profile', 'error')
    });
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedPsw = null;
  }
}