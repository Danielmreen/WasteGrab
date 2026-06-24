import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { PublicAuthSlidesResponse } from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthSlideService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/auth-slides`;
  private readonly opts = { withCredentials: true as const };

  listSlides(): Observable<PublicAuthSlidesResponse> {
    return this.http.get<PublicAuthSlidesResponse>(this.apiUrl, this.opts);
  }
}
