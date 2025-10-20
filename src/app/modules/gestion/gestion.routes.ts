import { Routes } from "@angular/router";

export const GESTION_ROUTES: Routes = [
  {
    path: "clientes",
    loadComponent: () =>
      import("./clientes/clientes-page.component").then(
        (m) => m.ClientesPageComponent
      ),
    canActivate: [() => import("../../core/roles.guard").then(m => m.rolesGuard)],
    data: { roles: ["Administrador", "Supervisor"] },
  },
  {
    path: "gestiones",
    loadComponent: () =>
      import("./gestiones/gestiones-page.component").then(
        (m) => m.GestionesPageComponent
      ),
  },
  {
    path: "mi-cliente",
    loadComponent: () =>
      import("./cliente-self/cliente-self-page.component").then(
        (m) => m.ClienteSelfPageComponent
      ),
    canActivate: [() => import("../../core/roles.guard").then(m => m.rolesGuard)],
    data: { roles: ["Cliente"] },
  },
  {
    path: "tipos-gestion",
    loadComponent: () =>
      import("./tipos-gestion/tipos-gestion-page.component").then(
        (m) => m.TiposGestionPageComponent
      ),
  },
  {
    path: "empleados",
    loadComponent: () =>
      import("./empleados/empleados-page.component").then(
        (m) => m.EmpleadosPageComponent
      ),
  },
  {
    path: "tipos-empleado",
    loadComponent: () =>
      import("./tipos-empleado/tipos-empleado-page.component").then(
        (m) => m.TiposEmpleadoPageComponent
      ),
  },
];
