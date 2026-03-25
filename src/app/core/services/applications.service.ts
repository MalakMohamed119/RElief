import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import {
  AcceptShiftDto,
  RejectShiftDto,
} from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ApplicationsService {
  private readonly apiUrl = environment.apiUrl;

  private authService = inject(AuthService);
  
  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = this.authService.getToken();
    return token 
      ? new HttpHeaders().set('Authorization', `Bearer ${token}`)
      : new HttpHeaders();
  }

  /** GET /api/applications – all applications for logged-in care home */
  getAllApplications(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/api/applications`, { headers: this.headers }).pipe(
      map((res) => this.normalizeApplicationsResponse(res))
    );
  }

  /**
   * GET /api/applications/requests
   * Query params: Status, PageIndex, PageSize, Sort, Search
   */
  getApplicationRequests(options?: {
    status?: string;
    pageIndex?: number;
    pageSize?: number;
    sort?: string;
    search?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (options?.status) {
      params = params.set('Status', options.status);
    }
    if (options?.pageIndex != null) {
      params = params.set('PageIndex', String(options.pageIndex));
    }
    if (options?.pageSize != null) {
      params = params.set('PageSize', String(options.pageSize));
    }
    if (options?.sort) {
      params = params.set('Sort', options.sort);
    }
    if (options?.search) {
      params = params.set('Search', options.search);
    }

    return this.http
      .get<any>(`${this.apiUrl}/api/applications/requests`, { headers: this.headers, params })
      .pipe(map((res) => this.normalizeApplicationsResponse(res)));
  }

  /** Normalize API response to array */
  normalizeApplicationsResponse(res: any): any[] {
    console.log('--- RAW API RESPONSE ---', res);
    const dataArray = res?.data || [];
    return this.normalizeApplicationItems(dataArray);
  }

  mapStatusToCode(status: string): number {
    const statusMap: {[key: string]: number} = {
      'Pending': 1,
      'QualifiedByAdmin': 1,
      'Qualified': 1,
      'Accepted': 2,
      'Rejected': 3,
      'Cancelled': 4
    };
    return statusMap[status] || 1;
  }

  normalizeApplicationItems(items: any[]): any[] {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
      const psw = item.psw || {};
      const shift = (item.shifts && item.shifts.length > 0) ? item.shifts[0] : {};
      const rawStatus = shift.status || item.status || 'Pending';

      return {
        id: psw.pswId,
        pswUserId: psw.pswId,
        jobRequestId: item.jobRequestId,
        jobRequestItemId: shift.jobRequestItemId,
        shiftId: shift.shiftId,
        pswName: psw.fullName || 'Unknown PSW',
        statusCode: this.mapStatusToCode(rawStatus),
        status: this.getStatusText(this.mapStatusToCode(rawStatus)),
        appliedAt: item.appliedAt,
        shiftDate: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime
      };
    });
  }

  /** UUID v4 regex validator - prevents 404s from fake IDs */
  isValidUUID(uuid: string | null): boolean {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  getStatusText(statusCode: number): string {
    switch (statusCode) {
      case 1: return 'Pending';
      case 2: return 'Accepted';
      case 3: return 'Rejected';
      case 4: return 'Cancelled';
      default: return 'Pending';
    }
  }

  /** GET /api/applications/{offerId} – applications for a specific offer */
  getApplicationsByOfferId(offerId: string): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/api/applications/${offerId}`, { headers: this.headers }).pipe(
      map((res) => this.normalizeApplicationsResponse(res))
    );
  }

  acceptShift(payload: AcceptShiftDto): Observable<any> {
    console.log('Accept payload:', payload);
    return this.http.post<any>(`${this.apiUrl}/api/applications/accept`, payload, { headers: this.headers });
  }

  acceptApplication(jobRequestItemId: string, shiftId: string): Observable<any> {
    const payload = { jobRequestItemId, shiftId };
    console.log('--- FINAL ACCEPT CALL ---', payload);
    return this.http.post<any>(`${this.apiUrl}/api/applications/accept`, payload, { headers: this.headers });
  }

  rejectShift(payload: RejectShiftDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/applications/reject`, payload, { headers: this.headers });
  }
}

