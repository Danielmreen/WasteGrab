import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Address, CreateAddressInput, UpdateAddressInput } from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/customer/address`;
  private readonly requestOptions = { withCredentials: true as const };

  listAddress() {
    return this.http.get<Address[]>(this.apiUrl, this.requestOptions);
  }

  getAddressById(id: string) {
    return this.http.get<Address>(`${this.apiUrl}/${id}`, this.requestOptions);
  }

  createAddress(input: CreateAddressInput) {
    return this.http.post<Address>(this.apiUrl, input, this.requestOptions);
  }

  updateAddress(id: string, input: Partial<UpdateAddressInput>) {
    return this.http.patch<Address>(`${this.apiUrl}/${id}`, input, this.requestOptions);
  }

  deleteAddress(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.requestOptions);
  }

  setDefaultAddress(id: string) {
    return this.http.post<Address>(`${this.apiUrl}/${id}/default`, {}, this.requestOptions);
  }
}
