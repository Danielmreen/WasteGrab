import { Router, type Request, type Response } from "express";
import type {
  ApiErrorResponse,
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from "@wastegrab/shared";
import {
  createTodo,
  deleteTodo,
  getTodoById,
  listTodos,
  updateTodo,
} from "../services/todo.service.js";
import { requireAuthenticatedUser } from "../middleware/require-auth.js";
import { getBody } from "../utils/request.js";

type TodoParams = {
  id: string;
};

const todoRouter = Router();

todoRouter.use(requireAuthenticatedUser);

todoRouter.get("/", async (req: Request, res: Response) => {
  const todos = await listTodos();

  res.json(todos);
});

todoRouter.get<TodoParams>("/:id", async (req, res) => {
  const todo = await getTodoById(req.params.id);

  if (!todo) {
    const payload: ApiErrorResponse = { error: "Todo not found." };
    res.status(404).json(payload);
    return;
  }

  res.json(todo);
});

todoRouter.post("/", async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<CreateTodoInput>;
  const title = normalizeTitle(body.title);

  if (!title) {
    const payload: ApiErrorResponse = { error: "Title is required." };
    res.status(400).json(payload);
    return;
  }

  const todo = await createTodo({ title });

  res.status(201).json(todo);
});

todoRouter.patch<TodoParams>("/:id", async (req, res) => {
  const body = getBody(req.body) as Partial<UpdateTodoInput>;

  if (Object.hasOwn(body, "title")) {
    const title = normalizeTitle(body.title);

    if (!title) {
      const payload: ApiErrorResponse = { error: "Title cannot be empty." };
      res.status(400).json(payload);
      return;
    }

    body.title = title;
  }

  if (Object.hasOwn(body, "completed") && typeof body.completed !== "boolean") {
    const payload: ApiErrorResponse = { error: "Completed must be a boolean." };
    res.status(400).json(payload);
    return;
  }

  const todo = await updateTodo(req.params.id, body);

  res.json(todo);
});

todoRouter.delete<TodoParams>("/:id", async (req, res) => {
  await deleteTodo(req.params.id);

  res.sendStatus(204);
});

export default todoRouter;

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}
