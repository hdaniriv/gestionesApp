import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../environments/environment";
import { catchError, throwError } from "rxjs";
import { NotifyService } from "../shared/notify/notify.service";

@Injectable({ providedIn: "root" })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.API_URL;
  private notify = inject(NotifyService);

  get<T>(url: string, params?: any) {
    return this.http.get<T>(`${this.base}${url}`, { params }).pipe(
      catchError((err) => this.handleError(err))
    );
  }
  post<T>(url: string, body: any) {
    return this.http.post<T>(`${this.base}${url}`, body).pipe(
      catchError((err) => this.handleError(err))
    );
  }
  patch<T>(url: string, body: any) {
    return this.http.patch<T>(`${this.base}${url}`, body).pipe(
      catchError((err) => this.handleError(err))
    );
  }
  delete<T>(url: string) {
    return this.http.delete<T>(`${this.base}${url}`).pipe(
      catchError((err) => this.handleError(err))
    );
  }

  private handleError(err: any) {
    const status = err?.status;
    const messageRaw = err?.error?.message ?? err?.message ?? "Error inesperado";
    const details = err?.error?.details;
    const message = this.normalizeMessage(messageRaw, details);
    // Mostrar notificaciones por códigos comunes si no son tratados arriba
    switch (status) {
      case 0:
        this.notify.error("No hay conexión con el servidor");
        break;
      case 400:
  this.notify.warning(message || "Solicitud inválida");
        break;
      case 401:
        this.notify.warning("No autorizado. Inicia sesión nuevamente.");
        break;
      case 403:
        this.notify.warning("Acceso denegado");
        break;
      case 404:
        this.notify.warning("Recurso no encontrado");
        break;
      case 409:
        this.notify.warning(message || "Conflicto en la solicitud");
        break;
      default:
        this.notify.error(message);
    }
    return throwError(() => err);
  }

  private normalizeMessage(message: unknown, details?: unknown): string {
    const lines: string[] = [];
    const pushLine = (m: any) => {
      if (!m) return;
      if (Array.isArray(m)) {
        m.forEach((x) => pushLine(x));
      } else if (typeof m === "object") {
        const maybeMsg = (m as any).message || (m as any).error || (m as any).msg;
        if (maybeMsg) pushLine(maybeMsg);
        else lines.push(JSON.stringify(m));
      } else {
        lines.push(String(m));
      }
    };
    pushLine(message);
    if (details) pushLine(details);
    const text = lines.filter(Boolean).join("\n• ");
    return text ? (lines.length > 1 ? `• ${text}` : text) : "Error inesperado";
  }
}
