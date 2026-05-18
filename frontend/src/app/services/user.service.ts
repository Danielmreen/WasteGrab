import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { User, CreateUserInput, UpdateUserInput } from '@wastegrab/shared';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/admin/users`;
  private readonly requestOptions = { withCredentials: true as const };

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, this.requestOptions);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`, this.requestOptions);
  }

  createUser(input: CreateUserInput): Observable<User> {
    return this.http.post<User>(this.apiUrl, input, this.requestOptions);
  }

  updateUser(id: string, input: UpdateUserInput): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, input, this.requestOptions);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.requestOptions);
  }
}
