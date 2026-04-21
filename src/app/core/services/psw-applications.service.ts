import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CancelApplicationDto } from '../models/api.models';

const PSW_APPLICATIONS_BASE = '/api/psw/applications';

@Injectable({
  providedIn: 'root',
})
export class PswApplicationsService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPswApplications(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}${PSW_APPLICATIONS_BASE}`).pipe(
      map((res: any) => {
        const list: any[] = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        return list.map((item: any) => ({
          jobRequestId:     item.jobRequestId     ?? null,
          jobRequestItemId: item.jobRequestItemId ?? null,
          shiftId:          item.shiftId          ?? null,
          offerId:          item.offerId          ?? null,
          offerTitle:       item.offerTitle       ?? '',
          date:             item.date             ?? '',
          startTime:        item.startTime        ?? '',
          endTime:          item.endTime          ?? '',
          status:           item.status           ?? 'QualifiedByAdmin',
        }));
      })
    );
  }

  cancelApplication(payload: CancelApplicationDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${PSW_APPLICATIONS_BASE}/cancel`, payload);
  }
}