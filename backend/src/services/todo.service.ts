import type { CreateTodoInput, Todo, UpdateTodoInput } from "@wastegrab/shared";
import type { TodoModel as TodoRecord } from "../generated/prisma/models/Todo.js";
import { prisma } from "../prisma.js";

export async function listTodos(): Promise<Todo[]> {
  const todos = await prisma.todo.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return todos.map(toTodoResponse);
}

export async function getTodoById(id: string): Promise<Todo | null> {
  const todo = await prisma.todo.findUnique({
    where: {
      id,
    },
  });

  if (!todo) {
    return null;
  }

  return toTodoResponse(todo);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const todo = await prisma.todo.create({
    data: {
      title: input.title,
    },
  });

  return toTodoResponse(todo);
}

export async function updateTodo(
  id: string,
  input: Partial<UpdateTodoInput>,
): Promise<Todo> {
  const data: { title?: string; completed?: boolean } = {};

  if (Object.hasOwn(input, "title")) {
    data.title = input.title;
  }

  if (Object.hasOwn(input, "completed")) {
    data.completed = input.completed;
  }

  const todo = await prisma.todo.update({
    where: {
      id,
    },
    data,
  });

  return toTodoResponse(todo);
}

export async function deleteTodo(id: string): Promise<void> {
  await prisma.todo.delete({
    where: {
      id,
    },
  });
}

function toTodoResponse(todo: TodoRecord): Todo {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}