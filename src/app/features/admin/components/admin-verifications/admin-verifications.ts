import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../../core/services/admin.service';
import { FileService } from '../../../../core/services/file.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  clientFilterSearch,
  clientPaginate,
  clientTotalPages,
} from '../../../../core/utils/admin-client-list';
import {
  buildProfileSections,
  formatProfileCell,
  isProfileFileIdRow,
  normalizeProfilePayload,
  type ProfileViewSection,
} from '../../../../core/utils/admin-profile-view';

interface VerificationItem {
  pswUserId: string;
  fullName: string;
  email: string;
  proofIdentityType: string;
  verificationStatus: string;
  rejectionReason: string | null;
  profileCompletedAt: string;
  proofIdentityFileId: string;
  pswCertificateFileId: string;
  cvFileId: string;
  immunizationRecordFileId: string;
  criminalRecordFileId: string;
  firstAidOrCPRFileId: string;
}

@Component({
  selector: 'app-admin-verifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-verifications.html',
  styleUrls: ['./admin-verifications.scss', '../../admin-common.scss'],
})
export class AdminVerifications implements OnInit {
  private admin = inject(AdminService);
  private files = inject(FileService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  readonly formatProfileCell = formatProfileCell;
  readonly isProfileFileIdRow = isProfileFileIdRow;

  fileOpeningId: string | null = null;

  private allVerifications: VerificationItem[] = [];

  verifications: VerificationItem[] = [];
  isLoading = true;
  error: string | null = null;
  rejectReason = '';
  rejectPswId: string | null = null;

  profileUserId: string | null = null;
  profileLoading = false;
  profileDetail: Record<string, unknown> | null = null;

  searchInput = '';
  pageIndex = 0;
  pageSize = 12;

  ngOnInit(): void {
    this.load();
  }

  get filteredCount(): number {
    return this.filteredAll.length;
  }

  get hasAnyLoaded(): boolean {
    return this.allVerifications.length > 0;
  }

  get totalPages(): number {
    return clientTotalPages(this.filteredCount, this.pageSize);
  }

  private get filteredAll(): VerificationItem[] {
    return clientFilterSearch(this.allVerifications, this.searchInput, (v) =>
      [v.fullName, v.email, v.proofIdentityType, v.pswUserId].filter(Boolean).join(' ')
    );
  }

  load(): void {
    this.isLoading = true;
    this.error = null;

    this.admin.getPendingVerificationsPaged().subscribe({
      next: ({ items, total }) => {
        const response = items as unknown as VerificationItem[];
        this.allVerifications = Array.isArray(response) ? response : [];
        if (this.allVerifications.length === 0 && total > 0) {
          /* API may return count only */
        }
        this.isLoading = false;
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading verifications:', err);
        this.error = err?.error?.message || err?.message || 'Failed to load verifications.';
        this.allVerifications = [];
        this.verifications = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private applyLocalPage(): void {
    const list = this.filteredAll;
    this.verifications = clientPaginate(list, this.pageIndex, this.pageSize);
    if (this.pageIndex > 0 && this.verifications.length === 0 && list.length > 0) {
      this.pageIndex = 0;
      this.verifications = clientPaginate(list, 0, this.pageSize);
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

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.applyLocalPage();
    this.cdr.detectChanges();
  }

  openProfile(pswUserId: string): void {
    if (!pswUserId) return;
    this.profileUserId = pswUserId;
    this.profileDetail = null;
    this.profileLoading = true;

    this.admin.getAdminUserProfile(pswUserId).subscribe({
      next: (data) => {
        const normalized = normalizeProfilePayload(data);
        this.profileDetail =
          normalized ??
          (data != null && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : { value: data as unknown });
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.profileLoading = false;
        this.notifications.show(
          (err as { error?: { message?: string } })?.error?.message || 'Failed to load profile.',
          'error'
        );
        this.profileUserId = null;
        this.cdr.detectChanges();
      },
    });
  }

  closeProfile(): void {
    this.profileUserId = null;
    this.profileDetail = null;
    this.fileOpeningId = null;
  }

  openProfileDocument(fileId: unknown): void {
    const id = typeof fileId === 'string' ? fileId.trim() : '';
    if (!id) return;
    this.fileOpeningId = id;
    this.files.getDownloadUrl(id).subscribe({
      next: (url) => {
        this.fileOpeningId = null;
        window.open(url, '_blank', 'noopener,noreferrer');
        this.cdr.detectChanges();
      },
      error: () => {
        this.fileOpeningId = null;
        this.notifications.show('Could not open document. Check permissions or file id.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  profileSections(): ProfileViewSection[] {
    return buildProfileSections(this.profileDetail);
  }

  get profileInitial(): string {
    const p = this.profileDetail;
    if (!p) return '?';
    const first = p['firstName'] ?? p['FirstName'];
    const email = p['email'] ?? p['Email'];
    const s = String(first || email || '?').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  }

  approve(pswId: string): void {
    if (!pswId) {
      this.notifications.show('Invalid PSW ID.', 'error');
      return;
    }

    this.admin.approveVerification(pswId).subscribe({
      next: () => {
        this.notifications.show('Verification approved successfully.', 'success');
        this.allVerifications = this.allVerifications.filter((v) => v.pswUserId !== pswId);
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.show(err?.error?.message || 'Failed to approve verification.', 'error');
      },
    });
  }

  openReject(pswId: string): void {
    this.rejectPswId = pswId;
    this.rejectReason = '';
  }

  submitReject(): void {
    if (!this.rejectPswId || !this.rejectReason.trim()) {
      this.notifications.show('Please enter a rejection reason.', 'error');
      return;
    }

    this.admin.rejectVerification(this.rejectPswId, { reason: this.rejectReason.trim() }).subscribe({
      next: () => {
        this.notifications.show('Verification rejected.', 'success');
        this.allVerifications = this.allVerifications.filter((v) => v.pswUserId !== this.rejectPswId);
        this.rejectPswId = null;
        this.rejectReason = '';
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.notifications.show(err?.error?.message || 'Failed to reject verification.', 'error');
      },
    });
  }

  cancelReject(): void {
    this.rejectPswId = null;
    this.rejectReason = '';
  }

  getDisplayName(v: VerificationItem): string {
    return v.fullName || 'N/A';
  }

  getEmail(v: VerificationItem): string {
    return v.email || 'N/A';
  }

  getIdentityType(v: VerificationItem): string {
    return v.proofIdentityType || 'N/A';
  }

  getSubmittedDate(v: VerificationItem): string {
    if (v.profileCompletedAt) {
      return new Date(v.profileCompletedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return 'N/A';
  }
}
