import { Routes } from "@angular/router";

export const GESTION_ROUTES: Routes = [
  {
    path: "gestiones",
    loadComponent: () =>
      import("./gestiones/gestiones-page.component").then(
        (m) => m.GestionesPageComponent
      ),
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
