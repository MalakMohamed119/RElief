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

interface DocumentFile {
  name: string;
  icon: string;
  rawFile: any;
  fileId: string | null;
  url: string | null;
  loading: boolean;
}

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
  profilePhoto?: any;
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

  readonly docConfig = [
    { key: 'proofIdentityFileId', name: 'Proof of Identity', icon: 'fa-id-card' },
    { key: 'pswCertificateFileId', name: 'PSW Certificate', icon: 'fa-certificate' },
    { key: 'cvFileId', name: 'CV / Resume', icon: 'fa-file-pdf' },
    { key: 'immunizationRecordFileId', name: 'Immunization Record', icon: 'fa-syringe' },
    { key: 'criminalRecordFileId', name: 'Criminal Record Check', icon: 'fa-shield-alt' },
    { key: 'firstAidOrCPRFileId', name: 'First Aid / CPR', icon: 'fa-heart' },
  ];

  fileOpeningId: string | null = null;

  private allVerifications: VerificationItem[] = [];

  verifications: VerificationItem[] = [];
  isLoading = true;
  error: string | null = null;
rejectReason = '';
  rejectPswId: string | null = null;
  rejecting = false;

  profileUserId: string | null = null;
  profileLoading = false;
  profileDetail: Record<string, unknown> | null = null;
  documentFiles: DocumentFile[] = [];
  docsLoading = false;

  searchInput = '';
  pageIndex = 0;
  pageSize = 12;

  ngOnInit(): void {
    this.load();
  }

  isProfileComplete(v: VerificationItem): boolean {
    return !!(v.profileCompletedAt && v.profileCompletedAt.trim());
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
        // Filter to only complete profiles (backend reject requirement)
        this.allVerifications = Array.isArray(response) 
          ? response.filter(v => this.isProfileComplete(v)) 
          : [];
        if (this.allVerifications.length === 0 && total > 0) {
          /* API may return count only - note: incomplete profiles filtered */
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

    // Fetch full profile to get profilePhoto.url (not available in verifications endpoint)
    this.admin.getAdminUserProfile(pswUserId).subscribe({
      next: (response: any) => {
        // API returns { success: true, data: { ... } } — unwrap it
        const data = response?.data ?? response;

        const verificationItem = this.allVerifications.find(v => v.pswUserId === pswUserId);
        this.profileDetail = {
          ...(verificationItem as any),
          ...data,
        };
        this.loadProfileDocuments();
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback: use verification item only (no photo)
        const verificationItem = this.allVerifications.find(v => v.pswUserId === pswUserId);
        if (verificationItem) {
          this.profileDetail = verificationItem as any;
          this.loadProfileDocuments();
        } else {
          this.profileLoading = false;
          this.profileUserId = null;
          this.notifications.show('Failed to load profile.', 'error');
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadProfileDocuments(): void {
    const verificationItem = this.allVerifications.find(v => v.pswUserId === this.profileUserId);
    if (!verificationItem) {
      this.profileLoading = false;
      this.docsLoading = false;
      this.notifications.show('Verification data not found.', 'error');
      this.profileUserId = null;
      return;
    }

    this.documentFiles = this.docConfig.map(cfg => ({
      name: cfg.name,
      icon: cfg.icon,
      rawFile: (verificationItem as any)[cfg.key] ?? null,
      fileId: null,
      url: null,
      loading: false
    })).filter(doc => doc.rawFile);

    const pending = this.documentFiles.filter(d => d.rawFile);
    let resolved = 0;

    if (pending.length === 0) {
      this.profileLoading = false;
      this.docsLoading = false;
      this.cdr.detectChanges();
      return;
    }

    pending.forEach(doc => {
      const fileId = doc.rawFile as string;
      doc.loading = true;
      doc.fileId = fileId;
      this.files.getDownloadUrl(fileId).subscribe({
        next: (url) => {
          doc.url = typeof url === 'string' ? url : (url as any).url || null;
          doc.loading = false;
          resolved++;
          if (resolved >= pending.length) {
            this.profileLoading = false;
            this.docsLoading = false;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          doc.loading = false;
          resolved++;
          if (resolved >= pending.length) {
            this.profileLoading = false;
            this.docsLoading = false;
          }
          this.cdr.detectChanges();
        }
      });
    });
  }

  closeProfile(): void {
    this.profileUserId = null;
    this.profileDetail = null;
    this.fileOpeningId = null;
  }

  openProfileDocument(fileId: string): void {
    if (!fileId) return;
    this.fileOpeningId = fileId;
    this.files.getDownloadUrl(fileId).subscribe({
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
    return []; // Docs only - no table view
  }

  get profileInitial(): string {
    const p = this.profileDetail;
    if (!p) return '?';
    const first = p['firstName'] ?? p['FirstName'];
    const last = p['lastName'] ?? p['LastName'];
    if (first && last) {
      return (String(first)[0] + String(last)[0]).toUpperCase();
    }
    const email = p['email'] ?? p['Email'];
    const full = p['fullName'] ?? p['FullName'];
    const s = String(first || full || email || '?').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  }

  get profileFullName(): string {
    const p = this.profileDetail;
    if (!p) return 'N/A';
    const first = p['firstName'] ?? p['FirstName'];
    const last = p['lastName'] ?? p['LastName'];
    if (first && last) {
      return `${first} ${last}`.trim();
    }
    return String(p['fullName'] ?? p['FullName'] ?? 'N/A');
  }

  getProfilePhotoUrl(): string | null {
    const p = this.profileDetail;
    if (!p) return null;

    // From full profile API: profilePhoto.url
    const photo = p['profilePhoto'] as any;
    if (photo?.url) return photo.url;

    // From profile upload-photo response
    if (typeof photo === 'string' && photo.trim()) return photo.trim();

    // Direct string field
    const img = p['profileImage'] as any;
    if (typeof img === 'string' && img.trim()) return img.trim();

    return null;
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
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

    this.rejecting = true;
    this.admin.rejectVerification(this.rejectPswId!, this.rejectReason.trim()).subscribe({
      next: () => {
        this.notifications.show('Verification rejected.', 'success');
        this.allVerifications = this.allVerifications.filter((v) => v.pswUserId !== this.rejectPswId);
        this.rejectPswId = null;
        this.rejectReason = '';
        this.applyLocalPage();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Reject verification failed:', this.rejectPswId, err);
        const msg = err?.error?.message || err?.message || 'Failed to reject verification.';
        this.notifications.show(msg, 'error');
        this.rejecting = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.rejecting = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelReject(): void {
    this.rejectPswId = null;
    this.rejectReason = '';
  }

  getProfilePhotoUrlForItem(v: VerificationItem): string | null {
    const photo = v?.profilePhoto as any;
    return photo?.url || null;
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

  getDisplayNameFromId(pswId: string): string {
    const v = this.allVerifications.find(item => item.pswUserId === pswId);
    return v ? this.getDisplayName(v) : 'N/A';
  }

  getEmailFromId(pswId: string): string {
    const v = this.allVerifications.find(item => item.pswUserId === pswId);
    return v ? this.getEmail(v) : 'N/A';
  }

  getIdentityTypeFromId(pswId: string): string {
    const v = this.allVerifications.find(item => item.pswUserId === pswId);
    return v ? this.getIdentityType(v) : 'N/A';
  }

  getPhoneFromId(pswId: string): string {
    const v = this.allVerifications.find(item => item.pswUserId === pswId);
    return v ? (v as any).phoneNumber || 'N/A' : 'N/A';
  }
}

