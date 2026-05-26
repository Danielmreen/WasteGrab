import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  CreatePickupRequestResponse,
  GetPickupRequestResponse,
  ListPickupRequestsResponse,
} from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PickupRequestService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/customer/pickups`;
  private readonly opts = { withCredentials: true as const };

  createPickupRequest(payload: FormData) {
    return this.http.post<CreatePickupRequestResponse>(this.apiUrl, payload, this.opts);
  }

  listPickupRequests() {
    return this.http.get<ListPickupRequestsResponse>(this.apiUrl, this.opts);
  }

  getPickupRequest(id: string) {
    return this.http.get<GetPickupRequestResponse>(`${this.apiUrl}/${id}`, this.opts);
  }

  cancelPickupRequest(id: string) {
    return this.http.patch<GetPickupRequestResponse>(`${this.apiUrl}/${id}/cancel`, {}, this.opts);
  }
}
