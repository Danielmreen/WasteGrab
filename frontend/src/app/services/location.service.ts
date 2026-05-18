import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LocationRecord {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  collectors?: Array<{ id: string; assignedAt: string; collector: any }>;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/locations`;
  private readonly opts = { withCredentials: true as const };

  listLocations(): Observable<LocationRecord[]> {
    return this.http.get<LocationRecord[]>(this.apiUrl, this.opts);
  }

  getLocation(id: string): Observable<LocationRecord> {
    return this.http.get<LocationRecord>(`${this.apiUrl}/${id}`, this.opts);
  }

  createLocation(payload: Partial<LocationRecord>) {
    return this.http.post<LocationRecord>(this.apiUrl, payload, this.opts);
  }

  assignCollector(locationId: string, collectorId: string) {
    return this.http.post(`${this.apiUrl}/${locationId}/assign`, { collectorId }, this.opts);
  }

  unassignCollector(locationId: string, collectorId: string) {
    return this.http.delete(`${this.apiUrl}/${locationId}/collectors/${collectorId}`, this.opts);
  }

  updateLocation(id: string, payload: Partial<LocationRecord>) {
    return this.http.patch<LocationRecord>(`${this.apiUrl}/${id}`, payload, this.opts);
  }

  deleteLocation(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`, this.opts);
  }
}
