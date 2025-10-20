import { Routes } from "@angular/router";
import { authGuard } from "./core/auth.guard";
import { rolesGuard } from "./core/roles.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/public/public-home.component").then(
        (m) => m.PublicHomeComponent
      ),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./pages/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "registro",
    loadComponent: () =>
      import("./pages/auth/register.component").then((m) => m.RegisterComponent),
  },
  {
    path: "app",
    loadComponent: () =>
      import("./pages/mainpage/mainpage.component").then(
        (m) => m.mainpageComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: "",
        loadComponent: () =>
          import("./pages/mainpage/welcome.component").then(
            (m) => m.WelcomeComponent
          ),
      },
      {
        path: "gestion",
        loadChildren: () =>
          import("./modules/gestion/gestion.routes").then(
            (m) => m.GESTION_ROUTES
          ),
        canActivate: [authGuard],
      },
      {
        path: "seguridad",
        loadChildren: () =>
          import("./modules/seguridad/seguridad.routes").then(
            (m) => m.SEGURIDAD_ROUTES
          ),
        canActivate: [authGuard, rolesGuard],
        data: { roles: ["Administrador", "Supervisor"] },
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
