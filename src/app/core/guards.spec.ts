import { authGuard } from "./auth.guard";
import { rolesGuard } from "./roles.guard";
import { AuthService } from "./auth.service";
import { Router } from "@angular/router";
import { simulateLogin, simulateLogout } from "./auth.testing";

class MockRouter {
  navigatedTo: string | null = null;
  navigateByUrl(url: string) {
    this.navigatedTo = url;
    return Promise.resolve(true);
  }
}

describe("Guards", () => {
  let auth: AuthService;
  let router: MockRouter;

  beforeEach(() => {
    auth = new AuthService();
    router = new MockRouter();
    // Monkey-patch global inject for this simple spec-less harness
    // Not a full Angular TestBed, but enough to invoke the guard functions.
    (globalThis as any).ng = {
      ɵinjectorDef: new Map([
        [AuthService, auth],
        [Router as any, router as any],
      ]),
    };
  });

  it("authGuard bloquea no autenticados", () => {
    simulateLogout(auth);
    const result = authGuard();
    expect(result).toBe(false);
    expect(router.navigatedTo).toBe("/login");
  });

  it("authGuard permite autenticados", () => {
    simulateLogin(auth, { username: "admin", roles: ["Administrador"] });
    const result = authGuard();
    expect(result).toBe(true);
  });

  it("rolesGuard permite roles requeridos", () => {
    simulateLogin(auth, { username: "super", roles: ["Supervisor"] });
    const snapshot: any = { data: { roles: ["Administrador", "Supervisor"] } };
    const result = rolesGuard(snapshot);
    expect(result).toBe(true);
  });

  it("rolesGuard bloquea roles no permitidos", () => {
    simulateLogin(auth, { username: "tech", roles: ["Técnico"] });
    const snapshot: any = { data: { roles: ["Administrador", "Supervisor"] } };
    const result = rolesGuard(snapshot);
    expect(result).toBe(false);
    expect(router.navigatedTo).toBe("/app");
  });
});
