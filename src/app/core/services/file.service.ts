import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

function extractUrlFromBody(body: unknown): string | null {
  if (body == null) return null;
  if (typeof body === 'string') {
    const t = body.trim();
    if (/^https?:\/\//i.test(t)) return t;
    return null;
  }
  if (typeof body === 'object' && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    const keys = [
      'url',
      'Url',
      'downloadUrl',
      'DownloadUrl',
      'signedUrl',
      'SignedUrl',
      'presignedUrl',
      'PresignedUrl',
      'sasUrl',
      'SasUrl',
      'blobUrl',
      'BlobUrl',
      'href',
      'Href',
      'link',
      'Link',
    ];
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) return v.trim();
    }
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class FileService {
  private readonly base = environment.apiUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  /**
   * GET /api/files/{fileId}/download-url — returns a temporary URL to open or download the file.
   */
  getDownloadUrl(fileId: string): Observable<string> {
    const id = fileId.trim();
    return this.http
      .get(`${this.base}/api/files/${encodeURIComponent(id)}/download-url`, { responseType: 'text' })
      .pipe(
        map((text) => {
          const trimmed = text?.trim() ?? '';
          let url = extractUrlFromBody(trimmed);
          if (!url && trimmed.startsWith('{')) {
            try {
              url = extractUrlFromBody(JSON.parse(trimmed) as unknown);
            } catch {
              /* ignore */
            }
          }
          if (!url) {
            throw new Error('Download URL not found in API response');
          }
          return url;
        })
      );
  }
}
