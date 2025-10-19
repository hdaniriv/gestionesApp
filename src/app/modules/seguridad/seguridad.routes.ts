import { Routes } from "@angular/router";

export const SEGURIDAD_ROUTES: Routes = [
  {
    path: "usuarios",
    loadComponent: () =>
      import("./usuarios/usuarios-page.component").then(
        (m) => m.UsuariosPageComponent
      ),
  },
  {
    path: "roles",
    loadComponent: () =>
      import("./roles/roles-page.component").then((m) => m.RolesPageComponent),
  },
];
