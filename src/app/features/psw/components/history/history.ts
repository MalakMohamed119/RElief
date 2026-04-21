import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PswNav } from "../../../../shared/components/psw-nav/psw-nav";
import { Footer } from "../../../../shared/components/footer/footer";
import { ToastComponent } from "../../../../shared/components/toast/toast";
import { PswApplicationsService } from '../../../../core/services/psw-applications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CancelApplicationDto } from '../../../../core/models/api.models';

interface PswApplication {
  jobRequestId: string;
  jobRequestItemId: string;
  shiftId: string;
  offerId: string;
  offerTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

class PswApplicationPresenter {
  constructor(public app: PswApplication) {}

  get statusLabel(): string {
    switch (this.app.status) {
      case 'Accepted':            return 'accepted';
      case 'RejectedByAdmin':
      case 'RejectedByCareHome':  return 'rejected';
      case 'Canceled':            return 'cancelled';
      default:                    return 'pending';
    }
  }

  get statusDisplay(): string {
    switch (this.app.status) {
      case 'Accepted':            return 'Accepted';
      case 'RejectedByAdmin':
      case 'RejectedByCareHome':  return 'Rejected';
      case 'Canceled':            return 'Cancelled';
      default:                    return 'Pending';
    }
  }
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule, PswNav, Footer, ToastComponent, DatePipe],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History implements OnInit {
  applications: PswApplicationPresenter[] = [];
  isLoading = true;
  selectedApp: PswApplicationPresenter | null = null;

  constructor(
    private pswApplicationsService: PswApplicationsService,
    private cdr: ChangeDetectorRef,
    private notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.pswApplicationsService.getPswApplications().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        this.applications = raw.map(a => new PswApplicationPresenter(a as PswApplication));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRequest(app: PswApplicationPresenter): void {
    this.selectedApp = app;
  }

  closeDetails(): void {
    this.selectedApp = null;
  }

  cancel(app: PswApplicationPresenter): void {
    if (!app?.app?.jobRequestItemId) {
      this.notifications.show('Cannot cancel: missing request id.', 'error');
      return;
    }
    const payload: CancelApplicationDto = { jobRequestItemId: app.app.jobRequestItemId };
    this.pswApplicationsService.cancelApplication(payload).subscribe({
      next: () => {
        this.notifications.show('Application cancelled successfully.', 'success');
        app.app.status = 'Canceled';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.show(err?.error?.message || 'Failed to cancel.', 'error');
      }
    });
  }

  getPendingCount(): number   { return this.applications.filter(a => a.statusLabel === 'pending').length; }
  getAcceptedCount(): number  { return this.applications.filter(a => a.statusLabel === 'accepted').length; }
  getRejectedCount(): number  { return this.applications.filter(a => a.statusLabel === 'rejected').length; }
  getCancelledCount(): number { return this.applications.filter(a => a.statusLabel === 'cancelled').length; }
}
