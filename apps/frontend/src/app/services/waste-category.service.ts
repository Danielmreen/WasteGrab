import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  CreateWasteCategoryInput,
  UpdateWasteCategoryInput,
  WasteCategory,
} from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WasteCategoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/waste-categories`;
  private readonly publicApiUrl = `${environment.apiBaseUrl}/waste-categories`;
  private readonly opts = { withCredentials: true as const };

  listPublicCategories(): Observable<WasteCategory[]> {
    return this.http.get<WasteCategory[]>(this.publicApiUrl);
  }

  listCategories(): Observable<WasteCategory[]> {
    return this.http.get<WasteCategory[]>(this.apiUrl, this.opts);
  }

  getCategory(id: string): Observable<WasteCategory> {
    return this.http.get<WasteCategory>(`${this.apiUrl}/${id}`, this.opts);
  }

  createCategory(payload: CreateWasteCategoryInput): Observable<WasteCategory> {
    return this.http.post<WasteCategory>(this.apiUrl, payload, this.opts);
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const payload = new FormData();
    payload.append('image', file);

    return this.http.post<{ imageUrl: string }>(`${this.apiUrl}/upload`, payload, this.opts);
  }

  updateCategory(id: string, payload: UpdateWasteCategoryInput): Observable<WasteCategory> {
    return this.http.patch<WasteCategory>(`${this.apiUrl}/${id}`, payload, this.opts);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.opts);
  }
}
