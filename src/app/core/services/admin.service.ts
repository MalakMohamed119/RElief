import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AdminPagedResult<T = unknown> {
  items: T[];
  total: number;
}

export function extractAdminPagedResult<T = unknown>(res: unknown): AdminPagedResult<T> {
  if (res == null) {
    return { items: [], total: 0 };
  }
  if (Array.isArray(res)) {
    const items = res as T[];
    return { items, total: items.length };
  }

  const root = res as Record<string, unknown>;
  const nested = root['result'] ?? root['Result'] ?? root['value'] ?? root['Value'] ?? root['payload'] ?? root['Payload'];
  const layers: Record<string, unknown>[] = [root];
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    layers.push(nested as Record<string, unknown>);
  }

  let rawList: unknown;
  for (const L of layers) {
    rawList = L['data'] ?? L['Data'] ?? L['items'] ?? L['Items'] ?? L['results'] ?? L['Results'] ?? L['records'] ?? L['Records'];
    if (Array.isArray(rawList)) break;
  }

  const items: T[] = Array.isArray(rawList) ? (rawList as T[]) : [];

  let total: number | null = null;
  const countKeys = ['totalCount', 'TotalCount', 'count', 'Count', 'total', 'Total', 'totalRecords', 'TotalRecords'];
  outer: for (const L of layers) {
    const layer = L as Record<string, unknown>;
    for (const key of countKeys) {
      const parsed = parseInt(String(layer[key]), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        total = parsed;
        break outer;
      }
    }
  }

  if (total == null) {
    total = items.length;
  } else if (items.length > total) {
    total = items.length;
  }

  return { items, total };
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAdminApplications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/applications`);
  }

  getAdminApplicationsPaged(status: string = 'Pending'): Observable<AdminPagedResult> {
    const params = new HttpParams().set('Status', status);
    return this.http.get<any>(`${this.apiUrl}/api/admin/applications`, { params }).pipe(
      map((rawResponse) => {
        console.log('🔍 Raw admin applications API response:', rawResponse);
        
        // Handle raw array case
        if (Array.isArray(rawResponse)) {
          return {
            items: rawResponse as any[],
            total: rawResponse.length
          };
        }
        
        // Existing logic for wrapped responses
        return extractAdminPagedResult(rawResponse);
      })
    );
  }

  approveApplication(requestId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/admin/applications/${requestId}/approve`, {});
  }

  rejectApplication(requestId: string, payload: { reason: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/admin/applications/${requestId}/reject`, payload);
  }

  getAdminOffers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/offers`);
  }

  getAdminOffersPaged(pageIndex: number = 1, pageSize: number = 100): Observable<AdminPagedResult> {
    const params = new HttpParams()
      .set('pageIndex', String(pageIndex))
      .set('pageSize', String(pageSize));
    return this.http.get<any>(`${this.apiUrl}/api/admin/offers`, { params }).pipe(
      map(extractAdminPagedResult)
    );
  }

  getPendingVerifications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/verifications/pending`);
  }

  getPendingVerificationsPaged(): Observable<AdminPagedResult> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/verifications/pending`).pipe(
      map(extractAdminPagedResult)
    );
  }

  approveVerification(pswId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/admin/verifications/${pswId}/approve`, {});
  }

  rejectVerification(pswId: string, reason: string): Observable<any> {
    const url = `${this.apiUrl}/api/admin/verifications/${pswId}/reject`;
    return this.http.post(url, { reason });
  }

  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/users`);
  }

  getUsersPaged(role?: string): Observable<AdminPagedResult> {
    let params = new HttpParams();
    if (role) {
      params = params.set('role', role);
    }
    return this.http.get<any>(`${this.apiUrl}/api/admin/users`, { params }).pipe(
      map(extractAdminPagedResult)
    );
  }

  getPswUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/users/PSW`);
  }

  getPswUsersPaged(): Observable<AdminPagedResult> {
    return this.http.get<any>(`${this.apiUrl}/api/admin/users/PSW`).pipe(
      map(extractAdminPagedResult)
    );
  }

  getAdminUserProfile(userId: string): Observable<any> {
    const params = new HttpParams().set('id', userId);
    return this.http.get<any>(`${this.apiUrl}/api/admin/users/profile`, { params });
  }
}

