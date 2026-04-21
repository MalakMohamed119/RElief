import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CompleteProfilePayload {
  proofIdentityType: string;
  workStatus: boolean;
  proofIdentityFile: File;
  proofIdentityFileBack?: File;
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

  private buildFormData(payload: CompleteProfilePayload): FormData {
    const formData = new FormData();
    formData.append('ProofIdentityType', payload.proofIdentityType);
    formData.append('WorkStatus', String(payload.workStatus));
    formData.append('ProofIdentityFile', payload.proofIdentityFile);
    if (payload.proofIdentityFileBack) {
      formData.append('ProofIdentityFileBack', payload.proofIdentityFileBack);
    }
    formData.append('PswCertificateFile', payload.pswCertificateFile);
    formData.append('CVFile', payload.cvFile);
    formData.append('ImmunizationRecordFile', payload.immunizationRecordFile);
    formData.append('CriminalRecordFile', payload.criminalRecordFile);
    if (payload.firstAidOrCPRFile) {
      formData.append('FirstAidOrCPRFile', payload.firstAidOrCPRFile);
    }
    return formData;
  }

  private onSuccess(): void {
    console.log('Complete profile service: setting profile complete and verification pending');
    this.authService.setProfileComplete();
    this.authService.setVerificationStatus('pending');
    console.log('Profile complete flag set in service:', this.authService.isProfileComplete());
  }

  completeProfile(payload: CompleteProfilePayload): Observable<any> {
    const formData = this.buildFormData(payload);
    return this.http.post<any>(`${this.apiUrl}/api/psw/profile`, formData).pipe(
      tap(() => this.onSuccess()),
      catchError((err) => {
        if (err.status === 409) {
          // Profile already exists → update instead
          console.log('409 on POST /api/psw/profile → falling back to PUT /api/profile');
          const putFormData = this.buildFormData(payload);
          return this.http.put<any>(`${this.apiUrl}/api/profile`, putFormData).pipe(
            tap(() => this.onSuccess())
          );
        }
        return throwError(() => err);
      })
    );
  }
}

