import { Injectable, inject, signal } from "@angular/core";
import { ApiService } from "./api.service";

export interface AuthUser {
  username: string;
  roles: string[];
}

@Injectable({ providedIn: "root" })
export class AuthService {
  userSig = signal<AuthUser | null>(null);
  private api = inject(ApiService);

  constructor() {
    // Intentar armar sesión desde storage
    const raw = localStorage.getItem("authUser");
    if (raw) {
      this.userSig.set(JSON.parse(raw));
    } else {
      // Si no hay authUser pero sí token, decodificar desde JWT
      const token = localStorage.getItem("accessToken");
      if (token) {
        const payload = this.decodeJwt<{ username?: string; roles?: string[] }>(
          token
        );
        if (payload?.username) {
          const user: AuthUser = {
            username: payload.username,
            roles: payload.roles || [],
          };
          localStorage.setItem("authUser", JSON.stringify(user));
          this.userSig.set(user);
        }
      }
    }
  }

  /**
   * Establece la sesión decodificando el JWT entregado por el backend.
   * Usa el claim roles del payload para poblar permisos en el frontend.
   */
  setSessionFromTokens(accessToken: string, refreshToken?: string) {
    if (!accessToken) return;
    localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    const payload = this.decodeJwt<{ username?: string; roles?: string[] }>(
      accessToken
    );
    const username = payload?.username || "";
    const roles = payload?.roles || [];

    const user: AuthUser = { username, roles };
    localStorage.setItem("authUser", JSON.stringify(user));
    this.userSig.set(user);
  }

  /**
   * Método legado para compatibilidad: mantiene firma anterior pero ya ignora roles externos
   * y decodifica el token para obtener roles/username del payload.
   */
  login(_username: string, accessToken: string, _roles: string[]) {
    this.setSessionFromTokens(accessToken);
  }

  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authUser");
    this.userSig.set(null);
  }

  /**
   * Solicita nuevos tokens usando el refreshToken almacenado y actualiza la sesión.
   */
  async refreshTokens(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;
    try {
      const res: any = await this.api
        .post("/auth/refresh", { refreshToken })
        .toPromise();
      const access = res?.accessToken;
      const refresh = res?.refreshToken;
      if (access) {
        this.setSessionFromTokens(access, refresh);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private normalizeRole(s: string) {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  hasRole(role: string) {
    const u = this.userSig();
    if (!u) return false;
    const target = this.normalizeRole(role);
    return (u.roles || []).some((r) => this.normalizeRole(r) === target);
  }

  /**
   * Decodifica el payload de un JWT (Base64URL) de forma segura en el navegador.
   */
  private decodeJwt<T = any>(token: string): T | null {
    try {
      const [, payloadB64] = token.split(".");
      if (!payloadB64) return null;
      // Base64URL -> Base64
      let base64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
      // Padding
      const pad = base64.length % 4;
      if (pad) base64 += "=".repeat(4 - pad);
      const json = atob(base64);
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
}
