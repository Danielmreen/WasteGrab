import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { HealthResponse } from "@wastegrab/shared";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import authRouter from "./routes/auth.routes.js";
import placesRouter from "./routes/places.routes.js";
import { adminUserRouter, adminLocationRouter, adminWasteCategoryRouter, adminVoucherRouter, customerAddressRouter, customerPickupRouter, customerVoucherRouter } from "./routes/index.js";
import roboflowAI from "./routes/roboflow-ai.js";
import wasteCategoryRouter from "./routes/waste-category.routes.js";

const app = express();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", config.corsOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.get("/api/health", (req: Request, res: Response) => {
  const payload: HealthResponse = {
    status: "ok",
    service: "wastegrab-api",
  };

  res.json(payload);
});

app.use("/api/auth", authRouter);
app.use("/api/places", placesRouter);
app.use("/api/admin/users", adminUserRouter);
app.use("/api/admin/locations", adminLocationRouter);
app.use("/api/admin/waste-categories", adminWasteCategoryRouter);
app.use("/api/admin/vouchers", adminVoucherRouter);
app.use("/api/customer/address", customerAddressRouter);
app.use("/api/customer/pickups", customerPickupRouter);
app.use("/api/customer/vouchers", customerVoucherRouter);
app.use("/api/roboflow-ai", roboflowAI);
app.use("/api/waste-categories", wasteCategoryRouter);

app.use(notFoundHandler);
app.use(errorHandler);


export default app;
