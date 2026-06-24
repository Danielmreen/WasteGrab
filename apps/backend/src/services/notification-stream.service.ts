import type { Response } from "express";

type NotificationStreamClient = {
  write: (event: string, data?: unknown) => void;
  close: () => void;
};

const clientsByUserId = new Map<string, Set<NotificationStreamClient>>();

export function registerNotificationStream(userId: string, res: Response): () => void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  const client: NotificationStreamClient = {
    write: (event, data = {}) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    close: () => {
      clearInterval(heartbeat);
      res.end();
    },
  };

  let clients = clientsByUserId.get(userId);
  if (!clients) {
    clients = new Set<NotificationStreamClient>();
    clientsByUserId.set(userId, clients);
  }

  clients.add(client);
  client.write("ready");

  return () => {
    clearInterval(heartbeat);
    clients?.delete(client);
    if (clients?.size === 0) {
      clientsByUserId.delete(userId);
    }
  };
}

export function emitNotificationEvent(userId: string): void {
  const clients = clientsByUserId.get(userId);
  if (!clients) {
    return;
  }

  for (const client of clients) {
    client.write("notification");
  }
}

export function emitPickupUpdateEvent(userId: string, pickupId: string): void {
  const clients = clientsByUserId.get(userId);
  if (!clients) {
    return;
  }

  for (const client of clients) {
    client.write("pickup-update", { pickupId });
  }
}
