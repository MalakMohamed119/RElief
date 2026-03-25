import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileDto, UpdateProfileDto } from '../models/api.models';

@Injectable({
  providedIn: 'root',
})
export class PswProfileService {
  private readonly apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  /** GET /api/profile – current user's profile */
  getMyProfile(): Observable<ProfileDto> {
    return this.http.get<ProfileDto>(`${this.apiUrl}/api/profile`);
  }

  /** PUT /api/profile – update current user's profile */
  updateMyProfile(payload: UpdateProfileDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/api/profile`, payload);
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
