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
      map((res) => this.normalizeApplicationsResponse(res))
    );
  }

  private normalizeApplicationsResponse(res: any): any[] {
    if (res == null) return [];
    if (Array.isArray(res)) return this.normalizeApplicationItems(res);
    const list =
      res.data ??
      res.items ??
      res.value ??
      res.results ??
      res.content ??
      res.applications ??
      res.list ??
      res.body;
    if (Array.isArray(list)) return this.normalizeApplicationItems(list);
    if (res.result != null && Array.isArray(res.result)) return this.normalizeApplicationItems(res.result);
    return [];
  }

  /** Pick first non-null from possible keys (supports nested obj.key.subKey) */
  private pick(item: any, ...keys: string[]): any {
    for (const k of keys) {
      const parts = k.split('.');
      let v: any = item;
      for (const p of parts) {
        v = v?.[p];
        if (v == null) break;
      }
      if (v != null && v !== '') return v;
    }
    return null;
  }

  private normalizeApplicationItems(list: any[]): any[] {
    return list.map((item) => {
      const jobReq = item.jobRequest ?? item.jobRequestItem ?? item.JobRequest ?? {};
      const offer = item.offer ?? item.Offer ?? jobReq.offer ?? jobReq ?? {};
      const shifts = item.shifts ?? item.Shifts ?? item.shift ?? jobReq.shifts ?? offer.shifts ?? [];
      const firstShift = Array.isArray(shifts) && shifts[0] ? shifts[0] : (typeof item.shift === 'object' && item.shift != null ? item.shift : null);
      const statusCode = item.statusCode ?? item.StatusCode ?? item.status ?? item.Status ?? jobReq.statusCode ?? 1;
      return {
        jobRequestItemId: item.jobRequestItemId ?? item.JobRequestItemId ?? item.id ?? item.Id ?? jobReq.id ?? jobReq.Id,
        offerId: this.pick(item, 'offerId', 'OfferId', 'offerID', 'jobRequest.offerId', 'jobRequest.offerID', 'jobRequestItem.offerId') ?? offer?.id ?? offer?.Id ?? jobReq?.offerId ?? null,
        offerTitle: this.pick(item, 'offerTitle', 'OfferTitle', 'title', 'Title', 'offer.title', 'jobRequest.title', 'jobRequest.offerTitle') ?? '',
        careHomeName: this.pick(item, 'careHomeName', 'CareHomeName', 'careHome', 'CareHome', 'offer.careHomeName', 'offer.careHome', 'jobRequest.careHomeName', 'careHome.name', 'offer.careHome.name', 'jobRequest.careHome.name') ?? '',
        address: this.pick(item, 'address', 'Address', 'location', 'Location', 'offer.address', 'offer.Address', 'jobRequest.address', 'jobRequest.location', 'offer.location') ?? '',
        hourlyRate: item.hourlyRate ?? item.HourlyRate ?? item.hourly_rate ?? offer?.hourlyRate ?? jobReq?.hourlyRate ?? null,
        shiftDate: this.pick(item, 'shiftDate', 'ShiftDate', 'date', 'Date', 'scheduleDate', 'shift.date', 'jobRequest.shiftDate', 'jobRequest.date') ?? (firstShift ? this.pick(firstShift, 'date', 'Date', 'shiftDate') : '') ?? '',
        startTime: (this.pick(item, 'startTime', 'StartTime', 'start', 'Start', 'jobRequest.startTime', 'jobRequest.start') ?? (firstShift ? this.pick(firstShift, 'startTime', 'start', 'Start') : '')) ?? '',
        endTime: (this.pick(item, 'endTime', 'EndTime', 'end', 'End', 'jobRequest.endTime', 'jobRequest.end') ?? (firstShift ? this.pick(firstShift, 'endTime', 'end', 'End') : '')) ?? '',
        statusCode
      };
    });
  }

  cancelApplication(payload: CancelApplicationDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${PSW_APPLICATIONS_BASE}/cancel`, payload);
  }
}
