import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileDto, UpdateProfileDto } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  /** GET /api/files/{fileId}/download-url */
  getFileDownloadUrl(fileId: string): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/api/files/${fileId}/download-url`);
  }

  /** GET /api/profile – current logged-in user's profile */
  getMyProfile(): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${this.apiUrl}/api/profile`);
  }

  /** PUT /api/profile – update current user's profile */
  updateMyProfile(payload: any): Observable<void> {
    const formData = new FormData();
    if (payload.firstName) formData.append('FirstName', payload.firstName);
    if (payload.lastName) formData.append('LastName', payload.lastName);
    if (payload.phoneNumber) formData.append('PhoneNumber', payload.phoneNumber);
    if (payload.address) {
      if (payload.address.apartmentNumber != null)
        formData.append('Address.ApartmentNumber', String(payload.address.apartmentNumber));
      if (payload.address.street)
        formData.append('Address.Street', payload.address.street);
      if (payload.address.city)
        formData.append('Address.City', payload.address.city);
      if (payload.address.state)
        formData.append('Address.State', payload.address.state);
      if (payload.address.postalCode)
        formData.append('Address.PostalCode', payload.address.postalCode);
      if (payload.address.country)
        formData.append('Address.Country', payload.address.country);
    }
    return this.http.put<void>(`${this.apiUrl}/api/profile`, formData);
  }

  /** GET /api/profile/{id} – profile by ID (for viewing others) */
  getProfileById(id: string): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${this.apiUrl}/api/profile/${id}`);
  }

  /** POST /api/profile/upload-photo – upload profile photo */
  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/api/profile/upload-photo`, formData);
  }
}

