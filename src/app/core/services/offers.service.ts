import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import {
  CreateJobOfferDto,
  UpdateJobOfferDto,
  ApplyToOfferDto,
} from '../models/api.models';
import { AuthService } from './auth.service';

const OFFERS_BASE = '/api/Offers';

@Injectable({
  providedIn: 'root',
})
export class OffersService {
  private readonly apiUrl = environment.apiUrl;
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) {}

  /** POST /api/Offers – body: { title, description, address, latitude, longitude, hourlyRate, shifts[] } */
  createOffer(payload: CreateJobOfferDto): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}${OFFERS_BASE}`, payload);
  }

  /** GET /api/Offers – returns observable of offer array (normalizes data/items/value/array) */
  getOffers(options?: {
    careHomeId?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<any[]> {
    let params = new HttpParams();
    if (options?.careHomeId) {
      params = params.set('careHomeId', options.careHomeId);
    }
    if (options?.pageNumber != null) {
      params = params.set('pageNumber', String(options.pageNumber));
    }
    if (options?.pageSize != null) {
      params = params.set('pageSize', String(options.pageSize));
    }

    return this.http.get<any>(`${this.apiUrl}${OFFERS_BASE}`, { params }).pipe(
      map((res) => this.normalizeOffersResponse(res))
    );
  }

  /** Extract offer list from API response (handles data / items / value / content / offers / direct array) */
  private normalizeOffersResponse(res: any): any[] {
    if (res == null) return [];
    if (Array.isArray(res)) return this.normalizeOfferItems(res);
    const list =
      res.data ??
      res.items ??
      res.value ??
      res.results ??
      res.content ??
      res.offers ??
      res.list;
    if (Array.isArray(list)) return this.normalizeOfferItems(list);
    return [];
  }

  /** Map each item to a display shape (handles PascalCase or camelCase from API) */
  private normalizeOfferItems(list: any[]): any[] {
    return list.map((o) => ({
      id: o.id ?? o.Id ?? o.offerId ?? o.offerID,
      title: o.title ?? o.Title ?? '',
      description: o.description ?? o.Description ?? '',
      address: o.address ?? o.Address ?? '',
      hourlyRate: o.hourlyRate ?? o.HourlyRate ?? o.hourly_rate ?? null,
      latitude: o.latitude ?? o.Latitude,
      longitude: o.longitude ?? o.Longitude,
      shifts: o.shifts ?? o.Shifts ?? []
    }));
  }

  /** GET /api/Offers – public browse for PSW (paged) */
  browseOffers(options?: {
    pageIndex?: number;
    pageSize?: number;
    sort?: string;
    search?: string;
  }): Observable<any[]> {
    let params = new HttpParams();
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
      .get<any>(`${this.apiUrl}/api/Offers`, { params })
      .pipe(map((res) => this.normalizeOffersResponse(res)));
  }

  getOfferById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${OFFERS_BASE}/${id}`);
  }

  /** GET /api/offers/{id}/details – returns full offer details with shifts for PSW */
  getOfferDetails(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}${OFFERS_BASE}/${id}`).pipe(
      map((res) => this.normalizeOfferDetails(res))
    );
  }

  /** Normalize detailed offer response */
  private normalizeOfferDetails(res: any): any {
    if (!res) return null;
    return {
      id: res.id ?? res.Id ?? res.offerId ?? res.offerID,
      title: res.title ?? res.Title ?? '',
      description: res.description ?? res.Description ?? '',
      address: res.address ?? res.Address ?? '',
      hourlyRate: res.hourlyRate ?? res.HourlyRate ?? res.hourly_rate ?? null,
      latitude: res.latitude ?? res.Latitude,
      longitude: res.longitude ?? res.Longitude,
      shifts: res.shifts ?? res.Shifts ?? [],
      careHomeId: res.careHomeId ?? res.CareHomeId,
      careHomeName: res.careHomeName ?? res.CareHomeName ?? '',
      requirements: res.requirements ?? res.Requirements ?? '',
      createdAt: res.createdAt ?? res.CreatedAt,
    };
  }

  updateOffer(id: string, payload: UpdateJobOfferDto | any): Observable<any> {
    console.log('Updating offer', id, payload);
    return this.http.put<any>(`${this.apiUrl}${OFFERS_BASE}/${id}`, payload);
  }

  deleteOffer(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}${OFFERS_BASE}/${id}`);
  }

  applyToOffer(payload: ApplyToOfferDto): Observable<any> {
    console.log('--- RAW APPLY REQUEST ---');
    console.log('Payload:', payload);
    console.log('User Role:', this.authService.getUserRole());
    console.log('Verification Status:', this.authService.getVerificationStatus());
    console.log('Full Profile:', this.authService.getUserProfile());
    console.log('Token present:', !!this.authService.getToken());
    
    console.log('--- APPLY REQUEST SENT TO SERVER (NO CLIENT BLOCK) ---', payload);
    
    // No local blocking - trust component validation and server enforcement
    return this.http.post<any>(`${this.apiUrl}/api/applications/apply`, payload);
  }
}
