import { z } from "zod";

const notificationEvents = {
  notification: z.object({
    type: z.enum(["info", "success", "warning", "error", "link"]),
    message: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
  }),
} as const;

type EventMap = typeof notificationEvents;
type EventPayload<K extends keyof EventMap> = z.infer<EventMap[K]>;
type Listener<K extends keyof EventMap> = (payload: EventPayload<K>) => void;

class NotificationBus {
  private listeners = new Map<string, Set<Listener<keyof EventMap>>>();

  publish<K extends keyof EventMap>(event: K, payload: EventPayload<K>): Promise<void> {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      for (const handler of handlers) {
        (handler as Listener<K>)(payload);
      }
    }
    return Promise.resolve();
  }

  subscribe<K extends keyof EventMap>(event: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(listener as Listener<keyof EventMap>);
    return () => {
      this.listeners.get(event as string)?.delete(listener as Listener<keyof EventMap>);
    };
  }
}

export const notificationBus = new NotificationBus();
export type NotificationPayload = EventPayload<"notification">;
