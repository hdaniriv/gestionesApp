import { CanActivateFn, Router, ActivatedRouteSnapshot } from "@angular/router";
import { inject } from "@angular/core";
import { AuthService } from "./auth.service";

export const rolesGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const required: string[] = route.data?.["roles"] || [];
  const user = auth.userSig();
  if (!user) {
    router.navigateByUrl("/login");
    return false;
  }
  if (required.length === 0) return true;
  const ok = required.some((r) => user.roles.includes(r));
  if (!ok) {
    router.navigateByUrl("/app");
    return false;
  }
  return true;
};
