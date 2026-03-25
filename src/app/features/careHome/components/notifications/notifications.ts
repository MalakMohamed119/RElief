import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Navbar } from '../../../../shared/components/navbar/navbar';
import { Footer } from '../../../../shared/components/footer/footer';
import { ApplicationsService } from '../../../../core/services/applications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { ProfileDto } from '../../../../core/models/api.models';
import { tap } from 'rxjs/operators';

interface Application {
  id: string;
  jobRequestItemId: string;
  pswUserId?: string | null;
  offerId: string;
  shiftId?: string | null;
  offerTitle: string;
  pswName: string;
  pswPhone: string;
  serviceType: string;
  address: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hourlyRate: number | null;
  statusCode: number;
  status: string;
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
  selectedAppId: string | null = null;

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

  loadApplications(): void {
    this.loading = true;
    this.error = null;

    const appsObservable = this.currentOfferId
      ? this.applicationsService.getApplicationsByOfferId(this.currentOfferId)
      : this.applicationsService.getAllApplications();
    
    appsObservable.pipe(tap((apps: any) => console.log('Final Apps for UI:', apps))).subscribe({
      next: (apps) => {
        this.applications = Array.isArray(apps) ? apps : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading applications:', err);
        this.error = err?.error?.message || 'Failed to load applications.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPendingCount(): number {
    return this.applications.filter(app => app.statusCode === 1).length;
  }

  getPendingApplications(): Application[] {
    return this.applications.filter(app => app.statusCode === 1);
  }

  getAcceptedApplications(): Application[] {
    return this.applications.filter(app => app.statusCode === 2);
  }

  getRejectedApplications(): Application[] {
    return this.applications.filter(app => app.statusCode === 3);
  }

  acceptRequest(app: Application): void {
    console.log('=== ACCEPT REQUEST app ===', app);

    const jobRequestItemId = app.jobRequestItemId;
    const shiftId = app.shiftId || '';

    if (!this.applicationsService.isValidUUID(jobRequestItemId)) {
      this.notificationService.show(`Cannot accept: Invalid jobRequestItemId "${jobRequestItemId}"`, 'error');
      return;
    }
    
    if (!this.applicationsService.isValidUUID(shiftId)) {
      this.notificationService.show(`Cannot accept: Invalid shiftId "${shiftId}"`, 'error');
      return;
    }

    this.acceptingId = jobRequestItemId;
    console.log('=== SENDING ACCEPT PAYLOAD ===', { shiftId, jobRequestItemId });
    
    this.applicationsService.acceptShift({ shiftId, jobRequestItemId }).subscribe({
      next: () => {
        this.notificationService.show('Application Accepted Successfully!', 'success');
        const idx = this.applications.findIndex(a => a.jobRequestItemId === jobRequestItemId);
        if (idx !== -1) {
          this.applications[idx].statusCode = 2;
          this.applications[idx].status = 'Accepted';
        }
        this.acceptingId = null;
        this.loadApplications();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Accept error:', err);
        this.notificationService.show(err?.error?.message || 'Accept failed', 'error');
        this.acceptingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  openRejectModal(app: Application): void {
    this.selectedAppId = app.jobRequestItemId;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
    this.selectedAppId = null;
  }

  confirmReject(): void {
    if (!this.selectedAppId || !this.rejectReason.trim()) {
      this.notificationService.show('Enter rejection reason', 'error');
      return;
    }

    if (!this.applicationsService.isValidUUID(this.selectedAppId)) {
      this.notificationService.show(`Cannot reject: Invalid ID "${this.selectedAppId}"`, 'error');
      return;
    }

    this.rejectingId = this.selectedAppId;
    console.log('=== SENDING REJECT PAYLOAD ===', { jobRequestItemId: this.selectedAppId });
    
    this.applicationsService.rejectShift({ jobRequestItemId: this.selectedAppId }).subscribe({
      next: () => {
        this.notificationService.show('✅ Application rejected', 'success');
        const idx = this.applications.findIndex(a => a.jobRequestItemId === this.selectedAppId);
        if (idx !== -1) {
          this.applications[idx].statusCode = 3;
          this.applications[idx].status = 'Rejected';
        }
        this.rejectingId = null;
        this.closeRejectModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Reject error:', err);
        this.notificationService.show(err?.error?.message || 'Reject failed', 'error');
        this.rejectingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // REQUIRED HTML METHODS - EXACT MATCH
  getPswName(app: any): string { 
    return app?.pswName || 'Unknown PSW'; 
  }

  formatDate(dateStr: string): string { 
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  }

  formatTime(timeStr: string): string { 
    return timeStr ? String(timeStr).substring(0, 5) : '--:--'; 
  }

  isProcessing(app: any): boolean { 
    return this.acceptingId === app?.jobRequestItemId || this.rejectingId === app?.jobRequestItemId; 
  }

  viewProfile(pswId: any): void {
    if (!pswId) {
      return;
    }
    this.profileService.getProfileById(pswId).subscribe({
      next: (data) => {
        this.selectedPsw = data;
        this.showProfileModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Profile fetch error:', err);
        this.notificationService.show('Failed to load profile', 'error');
      }
    });
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedPsw = null;
  }
}
