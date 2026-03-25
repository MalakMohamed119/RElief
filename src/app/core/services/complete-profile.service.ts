import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CompleteProfilePayload {
  proofIdentityType: string;
  workStatus: boolean;
  proofIdentityFile: File;
  pswCertificateFile: File;
  cvFile: File;
  immunizationRecordFile: File;
  criminalRecordFile: File;
  firstAidOrCPRFile?: File;
}

@Injectable({ providedIn: 'root' })
export class CompleteProfileService {
  private readonly apiUrl = environment.apiUrl;
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  completeProfile(payload: CompleteProfilePayload): Observable<any> {
    const formData = new FormData();

    // التأكد من أن الأسماء تطابق الـ Backend (Case Sensitive)
    formData.append('ProofIdentityType', payload.proofIdentityType);
    formData.append('WorkStatus', String(payload.workStatus)); 
    formData.append('ProofIdentityFile', payload.proofIdentityFile);
    formData.append('PswCertificateFile', payload.pswCertificateFile);
    formData.append('CVFile', payload.cvFile);
    formData.append('ImmunizationRecordFile', payload.immunizationRecordFile);
    formData.append('CriminalRecordFile', payload.criminalRecordFile);

    if (payload.firstAidOrCPRFile) {
      formData.append('FirstAidOrCPRFile', payload.firstAidOrCPRFile);
    }

    return this.http.post<any>(`${this.apiUrl}/api/psw/profile`, formData).pipe(
      tap(() => {
        // نداء الميثود لتحديث الحالة محلياً
        console.log('Complete profile service: setting profile complete and verification pending');
        this.authService.setProfileComplete();
        // Set verification status to pending after completing profile
        this.authService.setVerificationStatus('pending');
        console.log('Profile complete flag set in service:', this.authService.isProfileComplete());
      })
    );
  }
}