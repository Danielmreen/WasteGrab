import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '@wastegrab/shared';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/todos`;
  private readonly requestOptions = { withCredentials: true as const };

  listTodos() {
    return this.http.get<Todo[]>(this.apiUrl, this.requestOptions);
  }

  getTodoById(id: string) {
    return this.http.get<Todo>(`${this.apiUrl}/${id}`, this.requestOptions);
  }

  createTodo(input: CreateTodoInput) {
    return this.http.post<Todo>(this.apiUrl, input, this.requestOptions);
  }

  updateTodo(id: string, input: Partial<UpdateTodoInput>) {
    return this.http.patch<Todo>(`${this.apiUrl}/${id}`, input, this.requestOptions);
  }

  deleteTodo(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.requestOptions);
  }
}
