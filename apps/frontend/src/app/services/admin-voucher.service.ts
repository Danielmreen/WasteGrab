import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  AdminPointLedgerLog,
  AdminVoucherRedemptionLog,
  CreateVoucherInput,
  UpdateVoucherInput,
  Voucher,
} from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminVoucherService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/vouchers`;
  private readonly opts = { withCredentials: true as const };

  listVouchers(): Observable<Voucher[]> {
    return this.http.get<Voucher[]>(this.apiUrl, this.opts);
  }

  createVoucher(payload: CreateVoucherInput): Observable<Voucher> {
    return this.http.post<Voucher>(this.apiUrl, payload, this.opts);
  }

  updateVoucher(id: string, payload: UpdateVoucherInput): Observable<Voucher> {
    return this.http.patch<Voucher>(`${this.apiUrl}/${id}`, payload, this.opts);
  }

  deleteVoucher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.opts);
  }

  listRedemptions(): Observable<AdminVoucherRedemptionLog[]> {
    return this.http.get<AdminVoucherRedemptionLog[]>(`${this.apiUrl}/redemptions`, this.opts);
  }

  listPointLedger(): Observable<AdminPointLedgerLog[]> {
    return this.http.get<AdminPointLedgerLog[]>(`${this.apiUrl}/point-ledger`, this.opts);
  }
}
