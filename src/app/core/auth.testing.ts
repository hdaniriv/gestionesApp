import { AuthService, AuthUser } from "./auth.service";

export function simulateLogin(
  auth: AuthService,
  user: Partial<AuthUser> & { roles?: string[] } = {}
) {
  const username = user.username ?? "tester";
  const roles = user.roles ?? [];
  auth.login(username, "dummy-token", roles);
}

export function simulateLogout(auth: AuthService) {
  auth.logout();
}
