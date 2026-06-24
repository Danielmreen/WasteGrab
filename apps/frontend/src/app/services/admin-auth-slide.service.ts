import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  AuthSlide,
  CreateAuthSlideInput,
  UpdateAuthSlideInput,
} from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminAuthSlideService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/auth-slides`;
  private readonly opts = { withCredentials: true as const };

  listSlides(): Observable<AuthSlide[]> {
    return this.http.get<AuthSlide[]>(this.apiUrl, this.opts);
  }

  createSlide(payload: CreateAuthSlideInput): Observable<AuthSlide> {
    return this.http.post<AuthSlide>(this.apiUrl, payload, this.opts);
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const payload = new FormData();
    payload.append('image', file);

    return this.http.post<{ imageUrl: string }>(`${this.apiUrl}/upload`, payload, this.opts);
  }

  updateSlide(id: string, payload: UpdateAuthSlideInput): Observable<AuthSlide> {
    return this.http.patch<AuthSlide>(`${this.apiUrl}/${id}`, payload, this.opts);
  }

  deleteSlide(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.opts);
  }
}
