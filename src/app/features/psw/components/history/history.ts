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
  jobRequestItemId: string;
  offerId: string;
  offerTitle: string;
  careHomeName: string;
  address: string;
  hourlyRate: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  statusCode: number;
}

class PswApplicationPresenter {
  constructor(public app: PswApplication) {}

  get statusLabel(): string {
    switch (this.app.statusCode) {
      case 2: return 'rejected';
      case 3: return 'accepted';
      case 5: return 'cancelled';
      default: return 'pending';
    }
  }

  get statusDisplay(): string {
    switch (this.app.statusCode) {
      case 2: return 'Rejected';
      case 3: return 'Accepted';
      case 5: return 'Cancelled';
      default: return 'Pending';
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
      next: (apps: any[]) => {
        const all = apps ?? [];
        this.applications = all.map(app => new PswApplicationPresenter(app));
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
    const payload: CancelApplicationDto = {
      jobRequestItemId: app.app.jobRequestItemId,
    };
    this.pswApplicationsService.cancelApplication(payload).subscribe({
      next: () => {
        this.notifications.show('Application cancelled successfully.', 'success');
        app.app.statusCode = 5;
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to cancel application.';
        this.notifications.show(msg, 'error');
      }
    });
  }

  getPendingCount(): number {
    return this.applications.filter(a => a.statusLabel === 'pending').length;
  }

  getAcceptedCount(): number {
    return this.applications.filter(a => a.statusLabel === 'accepted').length;
  }

  getRejectedCount(): number {
    return this.applications.filter(a => a.statusLabel === 'rejected').length;
  }

  getCancelledCount(): number {
    return this.applications.filter(a => a.statusLabel === 'cancelled').length;
  }
}
