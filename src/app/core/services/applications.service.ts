import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApplicationsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getApplicationsForOffer(offerId: string): Observable<any[]> {
    console.log('Loading applications for offer:', offerId);
    return this.http.get<any>(`${this.apiUrl}/api/applications/${offerId}`).pipe(
      map((res: any) => {
        console.log('Raw getApplicationsForOffer response:', res);
        return Array.isArray(res) ? res : res?.data || res?.items || res?.applications || [];
      })
    );
  }

  getAllApplications(): Observable<any[]> {
    console.log('Loading ALL applications for CareHome');
    return this.http.get<any>(`${this.apiUrl}/api/applications`).pipe(
      map((res: any) => {
        console.log('Raw getAllApplications response:', res);
        if (Array.isArray(res)) return res;
        if (res?.data) return res.data;
        return [];
      })
    );
  }

  acceptShift(payload: { shiftId: string; jobRequestItemId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/applications/accept`, payload);
  }

  rejectShift(payload: { jobRequestItemId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/applications/reject`, payload);
  }

  isValidUUID(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }
}
