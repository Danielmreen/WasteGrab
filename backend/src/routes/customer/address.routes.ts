import { Router, type Request, type Response } from "express";
import type { ApiErrorResponse, Address, CreateAddressInput, UpdateAddressInput } from "@wastegrab/shared";
import { getBody } from "../../utils/request.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { listAddress, createAddress, getAddressById, updateAddress, deleteAddress, setDefaultAddress } from "../../services/address.service.js";

const addressRouter = Router();

addressRouter.get("/", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const address = await listAddress(user.id);
  res.json(address);
});

addressRouter.post("/", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const body = getBody(req.body) as Partial<CreateAddressInput>;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const street = typeof body.street === "string" ? body.street.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";

  if (!label || !street || !city || !state || !postalCode) {
    res.status(400).json({ error: "Missing required address fields." } as ApiErrorResponse);
    return;
  }

  try {
    const created = await createAddress(user.id, {
      label,
      street,
      city,
      state,
      postalCode,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    });

    res.status(201).json(created as Address);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create address.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

addressRouter.get("/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const id = String(req.params.id);
  const address = await getAddressById(id);

  if (!address || address.userId !== user.id) {
    res.status(404).json({ error: "Address not found." } as ApiErrorResponse);
    return;
  }

  res.json(address);
});

addressRouter.patch("/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const id = String(req.params.id);
  const existing = await getAddressById(id);
  if (!existing || existing.userId !== user.id) {
    res.status(404).json({ error: "Address not found." } as ApiErrorResponse);
    return;
  }

  const body = getBody(req.body) as Partial<UpdateAddressInput>;

  try {
    const updated = await updateAddress(id, body as UpdateAddressInput);
    res.json(updated as Address);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update address.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

addressRouter.delete("/:id", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const id = String(req.params.id);
  const existing = await getAddressById(id);
  if (!existing || existing.userId !== user.id) {
    res.status(404).json({ error: "Address not found." } as ApiErrorResponse);
    return;
  }

  await deleteAddress(id);
  res.status(204).send();
});

addressRouter.post("/:id/default", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
    return;
  }

  const id = String(req.params.id);
  try {
    const updated = await setDefaultAddress(user.id, id);
    res.json(updated as Address);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to set default address.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

export default addressRouter;
