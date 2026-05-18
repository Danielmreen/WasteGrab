# WasteGrab Todo Backend

Simple todo API built with Express 5, TypeScript, Prisma, and MySQL.

## Commands

```bash
npm install
npm run build
npm start
```

For local development with automatic restarts:

```bash
npm run dev
```

For a TypeScript-only check:

```bash
npm run typecheck
```

## Database

This backend uses Prisma ORM with MySQL.

Set your MySQL connection in `backend/.env`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/wastegrab"
```

Make sure the database exists:

```sql
CREATE DATABASE wastegrab;
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Create/update the database tables:

```bash
npm run prisma:migrate -- --name init
```

If you want to sync the schema without creating a migration:

```bash
npm run db:push
```

Open Prisma Studio:

```bash
npm run prisma:studio
```

## Environment

Create `backend/.env` from the example file:

```bash
cp .env.example .env
```

| Variable       | Default                 | Description                  |
| -------------- | ----------------------- | ---------------------------- |
| `PORT`         | `3000`                  | Backend server port          |
| `CORS_ORIGIN`  | `http://localhost:4200` | Frontend URL allowed by CORS |
| `DATABASE_URL` | MySQL connection string | Prisma database connection   |

The API runs on `http://localhost:3000` by default.

## Routes

| Method   | Path             | Description                             |
| -------- | ---------------- | --------------------------------------- |
| `GET`    | `/api/health`    | Check API status                        |
| `GET`    | `/api/todos`     | List todos                              |
| `GET`    | `/api/todos/:id` | Get one todo                            |
| `POST`   | `/api/todos`     | Create a todo with `{ "title": "..." }` |
| `PATCH`  | `/api/todos/:id` | Update `title` and/or `completed`       |
| `DELETE` | `/api/todos/:id` | Delete a todo                           |

Todos are stored in MySQL through Prisma.
