import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  AdminService,
  extractAdminPagedResult,
} from '../../../../core/services/admin.service';
import { AuthService } from '../../../../core/services/auth.service';

function countPendingApplications(items: unknown[]): number {
  return items.filter((a) => {
    const r = a as Record<string, unknown>;
    const s = String(r['status'] ?? r['Status'] ?? '').toLowerCase();
    if (s === 'pending') return true;
    const sc = r['statusCode'] ?? r['StatusCode'];
    return sc === 1 || sc === '1';
  }).length;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss'],
})
export class AdminDashboard implements OnInit {
  stats = {
    verifications: 0,
    applications: 0,
    offers: 0,
    users: 0,
  };
  isLoading = true;
  loadError: string | null = null;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.loadError = null;

    const safe = <T>(obs: Observable<T>, label: string) =>
      obs.pipe(
        catchError(() => {
          console.warn(`Dashboard stat failed: ${label}`);
          return of(null);
        })
      );

    forkJoin({
      verifications: safe(this.adminService.getPendingVerifications(), 'verifications'),
      applications: safe(this.adminService.getAdminApplications(), 'applications'),
      offers: safe(this.adminService.getAdminOffers(), 'offers'),
      users: safe(this.adminService.getUsers(), 'users'),
    }).subscribe({
      next: (raw) => {
        const v = raw.verifications ? extractAdminPagedResult(raw.verifications) : { items: [], total: 0 };
        this.stats.verifications = v.total;

        const apps = raw.applications ? extractAdminPagedResult(raw.applications) : { items: [], total: 0 };
        this.stats.applications =
          apps.items.length > 0 ? countPendingApplications(apps.items as unknown[]) : 0;

        const o = raw.offers ? extractAdminPagedResult(raw.offers) : { items: [], total: 0 };
        this.stats.offers = o.total;

        const u = raw.users ? extractAdminPagedResult(raw.users) : { items: [], total: 0 };
        this.stats.users = u.total;

        const anyFailed = Object.values(raw).some((x) => x === null);
        this.loadError = anyFailed ? 'Some statistics could not be loaded.' : null;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = 'Could not load dashboard statistics.';
        this.stats = { verifications: 0, applications: 0, offers: 0, users: 0 };
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
