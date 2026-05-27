import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  CustomerVoucherListResponse,
  CustomerVoucherRedemptionsResponse,
  RedeemVoucherResponse,
} from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CustomerVoucherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/customer/vouchers`;
  private readonly opts = { withCredentials: true as const };

  listVouchers(): Observable<CustomerVoucherListResponse> {
    return this.http.get<CustomerVoucherListResponse>(this.apiUrl, this.opts);
  }

  listRedemptions(): Observable<CustomerVoucherRedemptionsResponse> {
    return this.http.get<CustomerVoucherRedemptionsResponse>(`${this.apiUrl}/redemptions`, this.opts);
  }

  redeemVoucher(voucherId: string): Observable<RedeemVoucherResponse> {
    return this.http.post<RedeemVoucherResponse>(`${this.apiUrl}/${voucherId}/redeem`, {}, this.opts);
  }
}
