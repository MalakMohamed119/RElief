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
  isProfileImageUrlRow,
  normalizeProfilePayload,
  type ProfileViewRow,
  type ProfileViewSection,
} from '../../../../core/utils/admin-profile-view';

interface DocumentFile {
  name: string; icon: string; rawFile: any;
  fileId: string | null; url: string | null; loading: boolean;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss', '../../admin-common.scss'],
})
export class AdminUsers implements OnInit {
  private admin = inject(AdminService);
  private files = inject(FileService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  readonly formatProfileCell = formatProfileCell;
  readonly isProfileImageUrlRow = isProfileImageUrlRow;
  readonly isProfileFileIdRow = isProfileFileIdRow;

  readonly docConfig = [
    { key: 'proofIdentityFile', name: 'Proof of Identity', icon: 'fa-id-card' },
    { key: 'pswCertificateFile', name: 'PSW Certificate', icon: 'fa-certificate' },
    { key: 'cvFile', name: 'CV / Resume', icon: 'fa-file-pdf' },
    { key: 'immunizationRecordFile', name: 'Immunization Record', icon: 'fa-syringe' },
    { key: 'criminalRecordFile', name: 'Criminal Record Check', icon: 'fa-shield-alt' },
    { key: 'firstAidOrCPRFile', name: 'First Aid / CPR', icon: 'fa-heart' },
  ];

  fileOpeningId: string | null = null;
  documentFiles: DocumentFile[] = [];
  docsLoading = false;

  viewMode: 'directory' | 'psw' = 'directory';
  private allRows: Record<string, unknown>[] = [];
  rows: Record<string, unknown>[] = [];
  isLoading = true;
  error: string | null = null;
  searchInput = '';
  pageIndex = 0;
  pageSize = 12;
  roleFilter = '';
  verificationFilter: '' | 'None' | 'Pending' | 'Approved' | 'Rejected' = '';
  profileLoading = false;
profileDetail: Record<string, unknown> | null = null;

  get formattedDob(): string {
    const dobRaw = this.profileDetail?.['dateOfBirth'];
    if (!dobRaw) return 'N/A';
    const date = new Date(dobRaw as string);
    return isNaN(date.getTime()) ? String(dobRaw) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  selectedUserId: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  get filteredCount(): number {
    return this.filteredAll.length;
  }

  get totalPages(): number {
    return clientTotalPages(this.filteredCount, this.pageSize);
  }

  private get filteredAll(): Record<string, unknown>[] {
    let list = this.allRows;

    if (this.viewMode === 'psw' && this.verificationFilter) {
      const want = this.verificationFilter;
      list = list.filter((r) => {
        const v = r['verificationStatus'] ?? r['VerificationStatus'];
        return String(v ?? '') === want;
      });
    }

    if (this.viewMode === 'directory' && this.roleFilter.trim()) {
      const want = this.roleFilter.trim().toLowerCase();
      list = list.filter((r) => {
        const role = r['role'] ?? r['Role'];
        return String(role ?? '')
          .toLowerCase()
          .includes(want);
      });
    }

    return clientFilterSearch(list, this.searchInput, (r) =>
      [this.pickLabel(r), this.pickEmail(r), this.pickId(r) ?? '']
        .filter(Boolean)
        .join(' ')
    );
  }

  setView(mode: 'directory' | 'psw'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.pageIndex = 0;
    this.searchInput = '';
    this.verificationFilter = '';
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = null;

    const done = (items: Record<string, unknown>[]) => {
      this.allRows = items;
      this.isLoading = false;
      this.applyLocalPage();
      this.cdr.detectChanges();
    };

    if (this.viewMode === 'psw') {
      this.admin.getPswUsersPaged().subscribe({
        next: ({ items }) => done((items as Record<string, unknown>[]) ?? []),
        error: (err) => this.failLoad(err),
      });
      return;
    }

    this.admin.getUsersPaged().subscribe({
      next: ({ items }) => {
        const allUsers = (items as Record<string, unknown>[]) ?? [];
        console.log('Directory mode - general users loaded:', allUsers.length);
        
        this.admin.getPswUsersPaged().subscribe({
          next: ({ items: pswItems }) => {
            const pswUsers = (pswItems as Record<string, unknown>[]) ?? [];
            console.log('Directory mode - PSW users loaded:', pswUsers.length);
            
            const combinedUsers = [...allUsers, ...pswUsers];
            const uniqueUsers = combinedUsers.filter((user, index, self) => 
              index === self.findIndex((u: any) => u['id'] === user['id'])
            );
            
            console.log('Directory mode - total unique users:', uniqueUsers.length);
            done(uniqueUsers);
          },
          error: (err) => {
            console.warn('Failed to load PSW users, using general users only:', err);
            done(allUsers);
          }
        });
      },
      error: (err) => this.failLoad(err),
    });
  }

  private failLoad(err: unknown): void {
    console.error('Admin users load error:', err);
    const e = err as { error?: { message?: string }; message?: string };
    this.error = e?.error?.message || e?.message || 'Failed to load users.';
    this.allRows = [];
    this.rows = [];
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  private applyLocalPage(): void {
    const list = this.filteredAll;
    this.rows = clientPaginate(list, this.pageIndex, this.pageSize);
    if (this.pageIndex > 0 && this.rows.length === 0 && list.length > 0) {
      this.pageIndex = 0;
      this.rows = clientPaginate(list, 0, this.pageSize);
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

  pickId(row: Record<string, unknown>): string | null {
    const v =
      row['id'] ??
      row['userId'] ??
      row['UserId'] ??
      row['Id'] ??
      row['pswUserId'] ??
      row['PswUserId'];
    return v != null ? String(v) : null;
  }

  pickLabel(row: Record<string, unknown>): string {
    const name =
      row['fullName'] ??
      row['FullName'] ??
      row['name'] ??
      row['Name'] ??
      row['email'] ??
      row['Email'];
    return name != null ? String(name) : 'User';
  }

  pickEmail(row: Record<string, unknown>): string {
    const e = row['email'] ?? row['Email'];
    return e != null ? String(e) : '—';
  }

  pickRole(row: Record<string, unknown>): string {
    const r = row['role'] ?? row['Role'];
    return r != null ? String(r) : '—';
  }

  pickVerification(row: Record<string, unknown>): string {
    const v = row['verificationStatus'] ?? row['VerificationStatus'];
    return v != null ? String(v) : '—';
  }


  openProfile(row: Record<string, unknown>): void {
    const id = this.pickId(row);
    if (!id) {
      this.notifications.show('Could not resolve user id.', 'error');
      return;
    }
    this.selectedUserId = id;
    this.profileDetail = null;
    this.profileLoading = true;

    this.admin.getAdminUserProfile(id).subscribe({
      next: (data) => {
        const normalized = normalizeProfilePayload(data);
        this.profileDetail =
          normalized ??
          (data != null && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : { value: data as unknown });
        this.loadProfileDocuments();
        this.profileLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.profileLoading = false;
        this.notifications.show(
          (err as { error?: { message?: string } })?.error?.message || 'Failed to load profile.',
          'error'
        );
        this.selectedUserId = null;
        this.cdr.detectChanges();
      },
    });
  }

  closeProfile(): void {
    this.selectedUserId = null;
    this.profileDetail = null;
    this.documentFiles = [];
    this.docsLoading = false;
    this.fileOpeningId = null;
  }

  getProfilePhotoUrl(): string | null {
    const photo = this.profileDetail?.['profilePhoto'] as any;
    return photo?.url || null;
  }

  onPhotoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  loadProfileDocuments(): void {
    if (!this.profileDetail) {
      this.docsLoading = false;
      return;
    }

    if (this.profileDetail['role'] !== 'PSW') {
      this.documentFiles = [];
      this.docsLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.documentFiles = this.docConfig.map(cfg => {
      const fileData = (this.profileDetail as any)[cfg.key];
      if (!fileData || !fileData.id) {
        return null;
      }
      return {
        name: cfg.name,
        icon: cfg.icon,
        rawFile: fileData,
        fileId: fileData.id,
        url: null,
        loading: true
      };
    }).filter(Boolean) as DocumentFile[];

    const pending = [...this.documentFiles];
    let resolved = 0;

    if (pending.length === 0) {
      this.docsLoading = false;
      this.cdr.detectChanges();
      return;
    }

    pending.forEach(doc => {
      this.files.getDownloadUrl(doc.fileId!).subscribe({
        next: (url) => {
          doc.url = typeof url === 'string' ? url : (url as any)?.url || null;
          doc.loading = false;
          resolved++;
          if (resolved >= pending.length) {
            this.docsLoading = false;
          }
          this.cdr.detectChanges();
        },
        error: () => {
          doc.loading = false;
          resolved++;
          if (resolved >= pending.length) {
            this.docsLoading = false;
          }
          this.cdr.detectChanges();
        }
      });
    });
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

  get hasAnyLoaded(): boolean {
    return this.allRows.length > 0;
  }

  get profileInitial(): string {
    const p = this.profileDetail;
    if (!p) return '?';
    const first = p['firstName'] ?? p['FirstName'];
    const email = p['email'] ?? p['Email'];
    const s = String(first || email || '?').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  }

  get profileHeadline(): string {
    const p = this.profileDetail;
    if (!p) return '';
    const fn = p['firstName'] ?? p['FirstName'];
    const ln = p['lastName'] ?? p['LastName'];
    const full = p['fullName'] ?? p['FullName'];
    const parts = [fn, ln].map((x) => (x != null ? String(x).trim() : '')).filter(Boolean);
    const name = parts.length ? parts.join(' ') : full != null ? String(full).trim() : '';
    const email = p['email'] ?? p['Email'];
    return name || (email != null ? String(email) : '') || 'User profile';
  }

  get profileHeaderPhoto(): string | null {
    if (!this.profileDetail) return null;
    for (const sec of buildProfileSections(this.profileDetail)) {
      for (const row of sec.rows) {
        if (!isProfileImageUrlRow(row)) continue;
        const v = row.value;
        if (typeof v === 'string') return v.trim();
      }
    }
    return null;
  }

  showProfileRow(row: ProfileViewRow): boolean {
    if (!isProfileImageUrlRow(row)) return true;
    return this.profileHeaderPhoto == null;
  }
}
