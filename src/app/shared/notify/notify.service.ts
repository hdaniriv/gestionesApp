import { Injectable, signal } from "@angular/core";

export type NotifyLevel = "info" | "success" | "warning" | "error";

export interface NotifyMessage {
  id: number;
  level: NotifyLevel;
  title?: string;
  message: string;
  timeout?: number; // ms; si no hay timeout, requiere acción manual (persistente)
  actions?: Array<{
    label: string;
    value: string;
    kind?: "primary" | "default" | "danger";
  }>;
  // Si es confirmación, resolvemos una promesa con true/false
  resolver?: (value: boolean) => void;
}

@Injectable({ providedIn: "root" })
export class NotifyService {
  private counter = 0;
  messages = signal<NotifyMessage[]>([]);

  private push(msg: Omit<NotifyMessage, "id">) {
    const id = ++this.counter;
    const entry: NotifyMessage = { id, ...msg };
    this.messages.update((arr) => [...arr, entry]);
    if (entry.timeout && !entry.actions?.length && !entry.resolver) {
      setTimeout(() => this.dismiss(id), entry.timeout);
    }
    return id;
  }

  dismiss(id: number) {
    this.messages.update((arr) => arr.filter((m) => m.id !== id));
  }

  info(message: string, title?: string, timeout = 4000) {
    return this.push({ level: "info", message, title, timeout });
  }
  success(message: string, title?: string, timeout = 4000) {
    return this.push({ level: "success", message, title, timeout });
  }
  warning(message: string, title?: string, timeout = 5000) {
    return this.push({ level: "warning", message, title, timeout });
  }
  error(message: string, title?: string, timeout = 6000) {
    return this.push({ level: "error", message, title, timeout });
  }

  confirm(message: string, title = "Confirmación"): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const id = this.push({
        level: "warning",
        title,
        message,
        actions: [
          { label: "Cancelar", value: "cancel" },
          { label: "Confirmar", value: "ok", kind: "primary" },
        ],
        resolver: (value: boolean) => resolve(value),
      });
      // Auto-focus manejarlo en el componente visual
    });
  }

  resolveAction(id: number, value: string) {
    const found = this.messages().find((m) => m.id === id);
    if (!found) return;
    if (found.resolver) {
      found.resolver(value === "ok");
    }
    this.dismiss(id);
  }
}
