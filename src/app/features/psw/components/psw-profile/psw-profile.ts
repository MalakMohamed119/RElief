import { Component, OnInit, ChangeDetectorRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { PswNav } from "../../../../shared/components/psw-nav/psw-nav";
import { Footer } from "../../../../shared/components/footer/footer";
import { ToastComponent } from "../../../../shared/components/toast/toast";
import { ProfileService } from '../../../../core/services/profile.service';
import { FileService } from '../../../../core/services/file.service';
import { PswApplicationsService } from '../../../../core/services/psw-applications.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Subscription } from 'rxjs';

interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  profileImage: string | null;
  cvFile?: any;
  pswCertificateFile?: any;
  proofIdentityFile?: any;
  immunizationRecordFile?: any;
  criminalRecordFile?: any;
  firstAidCprFile?: any;
}

interface DocumentFile {
  name: string;
  icon: string;
  rawFile: any;
  url: string | null;
  loading: boolean;
  error: boolean;
}

@Component({
  selector: 'app-psw-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PswNav, Footer, ToastComponent],
  templateUrl: './psw-profile.html',
  styleUrls: ['./psw-profile.scss']
})
export class PswProfile implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private fileService = inject(FileService);
  private pswApplicationsService = inject(PswApplicationsService);
  private notifications = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);

  profile: ProfileInfo = {
    name: '', email: '', phone: '', location: '',
    joinDate: 'Active User', profileImage: null
  };

  documentFiles: DocumentFile[] = [];
  applications: any[] = [];

  isLoading = true;
  docsLoading = false;
  isSaving = false;
  verificationStatus: string | null = null;
  isProfileComplete = false;
  isVerified = false;
  rejectionReason: string | null = null;
  hasFiles = false;

  editModel = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    address: {
      apartmentNumber: 0,
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    }
  };

  private profileSub?: Subscription;

  readonly docConfig = [
    { key: 'cvFile',                 name: 'CV / Resume',          icon: 'fa-file-pdf'    },
    { key: 'pswCertificateFile',     name: 'PSW Certificate',       icon: 'fa-certificate' },
    { key: 'proofIdentityFile',      name: 'Proof of Identity',     icon: 'fa-id-card'     },
    { key: 'immunizationRecordFile', name: 'Immunization Record',   icon: 'fa-syringe'     },
    { key: 'criminalRecordFile',     name: 'Criminal Record Check', icon: 'fa-shield-alt'  },
    { key: 'firstAidCprFile',        name: 'First Aid / CPR',       icon: 'fa-heart'       },
  ];

  // ── Stats ──────────────────────────────────────────────────────────────────

  getApplicationsCount(): number {
    return this.applications.length;
  }

  getAcceptedCount(): number {
    return this.applications.filter(a => a.status === 'Accepted').length;
  }

  getHiredCount(): number {
    return this.applications.filter(a => a.status === 'Accepted').length;
  }

  getPendingCount(): number {
    return this.applications.filter(a =>
      a.status === 'QualifiedByAdmin' || a.status === 'Pending'
    ).length;
  }

  // ── Doc helpers ────────────────────────────────────────────────────────────

  private getDirectUrl(raw: any): string | null {
    if (!raw) return null;
    if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) return raw.trim();
    if (typeof raw === 'object' && raw.url) return raw.url;
    return null;
  }

  private getFileId(raw: any): string | null {
    if (!raw || typeof raw === 'string') return null;
    return raw.id ?? null;
  }

  get hasAnyDoc(): boolean {
    return this.documentFiles.some(d => !!d.rawFile);
  }

  // ── Load docs ──────────────────────────────────────────────────────────────

  loadDocumentFiles(): void {
    this.docsLoading = true;
    this.documentFiles = this.docConfig.map(cfg => ({
      name: cfg.name,
      icon: cfg.icon,
      rawFile: (this.profile as any)[cfg.key] ?? null,
      url: this.getDirectUrl((this.profile as any)[cfg.key]),
      loading: false,
      error: false
    }));

    const pending = this.documentFiles.filter(d => d.rawFile && !d.url);

    if (pending.length === 0) {
      this.docsLoading = false;
      this.hasFiles = this.documentFiles.some(d => !!d.url);
      this.cdr.detectChanges();
      return;
    }

    let resolved = 0;
    pending.forEach(doc => {
      const fileId = this.getFileId(doc.rawFile);
      if (!fileId) {
        resolved++;
        this.checkDone(resolved, pending.length);
        return;
      }
      doc.loading = true;
      this.fileService.getDownloadUrl(fileId).subscribe({
        next: (res: any) => {
          doc.url = (typeof res === 'string') ? res : (res?.url ?? null);
          doc.loading = false;
          resolved++;
          this.checkDone(resolved, pending.length);
          this.cdr.detectChanges();
        },
        error: () => {
          doc.error = true;
          doc.loading = false;
          resolved++;
          this.checkDone(resolved, pending.length);
          this.cdr.detectChanges();
        }
      });
    });
  }

  private checkDone(resolved: number, total: number): void {
    if (resolved >= total) {
      this.docsLoading = false;
      this.hasFiles = this.documentFiles.some(d => !!d.url);
      this.cdr.detectChanges();
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.authService.loadUserProfile().subscribe();
    this.loadProfile();
    this.loadApplications();
    this.profileSub = this.authService.userProfile$.subscribe((profile: any) => {
      if (profile) {
        this.verificationStatus = profile.verificationStatus || 'None';
        this.rejectionReason = profile.rejectionReason || null;
        this.isProfileComplete = !!profile.isProfileCompleted;
        this.isVerified = this.verificationStatus === 'Approved';
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  loadApplications(): void {
    this.pswApplicationsService.getPswApplications().subscribe({
      next: (apps: any[]) => {
        this.applications = apps || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.applications = [];
      }
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authService.loadUserProfile().subscribe({
      next: () => {
        this.profileService.getMyProfile().subscribe({
          next: (p: any) => {
            const address = p.address
              ? `${p.address.street}, ${p.address.city}, ${p.address.country}`
              : '';
            this.profile = {
              name:                   `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || 'Profile',
              email:                  p.email ?? '',
              phone:                  p.phoneNumber ?? '',
              location:               address,
              joinDate:               'Active User',
              profileImage:           p.profilePhoto?.url || null,
              cvFile:                 p.cvFile               ?? null,
              pswCertificateFile:     p.pswCertificateFile   ?? null,
              proofIdentityFile:      p.proofIdentityFile    ?? null,
              immunizationRecordFile: p.immunizationRecordFile ?? null,
              criminalRecordFile:     p.criminalRecordFile   ?? null,
              firstAidCprFile:        p.firstAidOrCPRFile    ?? null,
            };
            this.editModel = {
              firstName:   p.firstName   ?? '',
              lastName:    p.lastName    ?? '',
              phoneNumber: p.phoneNumber ?? '',
              address: {
                apartmentNumber: p.address?.apartmentNumber ?? 0,
                street:          p.address?.street          ?? '',
                city:            p.address?.city            ?? '',
                state:           p.address?.state           ?? '',
                postalCode:      p.address?.postalCode      ?? '',
                country:         p.address?.country         ?? '',
              }
            };
            const vs = (p.verificationStatus || 'None') as string;
            this.verificationStatus = vs.charAt(0).toUpperCase() + vs.slice(1).toLowerCase();
            this.isProfileComplete = !!p.isProfileCompleted;
            this.isVerified        = this.verificationStatus === 'Approved';
            this.rejectionReason   = p.rejectionReason || null;

            this.isLoading = false;
            this.loadDocumentFiles();
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('Profile load error:', err);
            this.notifications.show('Failed to load profile.', 'error');
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        console.error('Auth profile load error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  saveProfile(): void {
    this.isSaving = true;
    this.profileService.updateMyProfile(this.editModel).subscribe({
      next: () => {
        this.notifications.show('Profile updated successfully.', 'success');
        this.isSaving = false;
        this.loadProfile();
      },
      error: (err: any) => {
        console.error('Save error:', err);
        this.notifications.show('Failed to update profile.', 'error');
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.profileService.uploadPhoto(file).subscribe({
      next: () => { this.notifications.show('Photo updated.', 'success'); this.loadProfile(); },
      error: () => { this.notifications.show('Failed to upload photo.', 'error'); }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  }

  getVerificationLabel(): string {
    if (this.isVerified)                        return 'Verified PSW';
    if (this.verificationStatus === 'Pending')  return 'Under Review';
    if (this.verificationStatus === 'Rejected') return 'Rejected';
    return 'Not Verified';
  }

  getVerificationClass(): string {
    if (this.isVerified)                        return 'verified';
    if (this.verificationStatus === 'Pending')  return 'pending';
    if (this.verificationStatus === 'Rejected') return 'rejected';
    return 'not-verified';
  }
}