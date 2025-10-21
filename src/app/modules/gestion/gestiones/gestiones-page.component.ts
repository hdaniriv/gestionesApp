import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { SharedModule } from "../../../shared/shared.module";
import { firstValueFrom } from "rxjs";
import { Router } from "@angular/router";
import { NotifyService } from "../../../shared/notify/notify.service";

interface Gestion {
  id?: number;
  codigo?: string;
  idCliente: number;
  idTecnico?: number;
  tecnicoNombre?: string;
  idTipoGestion: number;
  direccion: string;
  latitud?: string;
  longitud?: string;
  fechaProgramada?: string; // ISO string
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
  estado?: string;
  fechaCreacion?: string;
  fechaModificacion?: string;
  idUsuarioCreador?: number;
}
interface TipoGestion {
  id: number;
  nombre: string;
}
interface Empleado {
  id: number;
  nombres: string;
  apellidos: string;
  idEmpleadoTipo?: number;
}
interface EmpleadoTipo { id: number; nombre: string; }
interface ClienteLite {
  id: number;
  nombre: string;
  nit?: string;
}

interface Usuario {
  id: number;
  username: string;
  nombre?: string;
  email?: string;
}

@Component({
  standalone: true,
  selector: "app-gestiones-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent, SharedModule],
  templateUrl: "./gestiones-page.component.html",
  styleUrls: ["./gestiones-page.component.css"],
})
export class GestionesPageComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  gestiones = signal<Gestion[]>([]);
  tipos = signal<TipoGestion[]>([]);
  empleados = signal<Empleado[]>([]);
  empleadoTipos = signal<EmpleadoTipo[]>([]);
  clientes = signal<ClienteLite[]>([]);
  selfCliente?: any;
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Gestion = { idCliente: 0, idTipoGestion: 0, direccion: "" } as any;
  asignacionOpen = signal(false);
  asignacionDraft: { idTecnico?: number; fechaInicio?: string; fechaFin?: string } = {};
  // Auditoría: nombre del usuario creador resuelto desde el microservicio principal
  creatorNombre = signal<string | null>(null);
  private usuarioCache = new Map<number, string>();

  filtros: {
    desde?: string;
    hasta?: string;
    idTipoGestion?: number;
    estado?: string;
  } = {};

  filtersOpen = true;
  estadosPosibles: string[] = ["Nuevo", "Asignado", "En Proceso", "Finalizado", "Pendiente"];

  canCreate() {
    return (
      this.auth.hasRole("Administrador") ||
      this.auth.hasRole("Supervisor") ||
      this.auth.hasRole("Cliente")
    );
  }
  canEdit() {
    return (
      this.auth.hasRole("Administrador") ||
      this.auth.hasRole("Supervisor") ||
  this.auth.hasRole("Tecnico")
    );
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }
  canAsignar() {
    return (
      this.auth.hasRole("Administrador") ||
      this.auth.hasRole("Supervisor") ||
  this.auth.hasRole("Tecnico")
    );
  }

  tipoNombre(id?: number) {
    return this.tipos().find((t) => t.id === id)?.nombre || id;
  }
  empleadoNombre(id?: number) {
    // Si el draft actual tiene tecnicoNombre, úsalo (para vistas/detalle)
    if (this.draft && this.draft.idTecnico === id && this.draft.tecnicoNombre) {
      return this.draft.tecnicoNombre;
    }
    const found = this.empleados().find((e) => e.id === id);
    return found ? `${found.nombres} ${found.apellidos}` : "";
  }

  computeEstadoDisplay(g: Partial<Gestion>): string {
    if (g.fechaFin) return "Finalizado";
    if (g.fechaInicio) return "En Proceso";
    if (g.idTecnico) return "Asignado";
    return "Nuevo";
  }

  private toInputDateTime(value?: string | Date): string | undefined {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return undefined;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    // datetime-local requiere YYYY-MM-DDTHH:MM
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  async ngOnInit() {
    this.setDefaultDateFilters();
    await Promise.all([
      this.loadTipos(),
      this.loadEmpleadosIfAllowed(),
      this.loadClientesIfAllowed(),
      this.loadSelfClienteIfClienteRole(),
    ]);
    await this.load();
  }
  async load() {
    // Usar el endpoint de búsqueda que aplica reglas por rol en el backend
    const params: any = {};
    if (this.filtros.desde) params.desde = this.filtros.desde;
    if (this.filtros.hasta) params.hasta = this.filtros.hasta;
    if (this.filtros.idTipoGestion) params.idTipoGestion = this.filtros.idTipoGestion;
    if (this.filtros.estado) params.estado = this.filtros.estado;
    const list = await firstValueFrom(
      this.api.get<Gestion[]>("/gestion/gestiones/search", params)
    );
    this.gestiones.set(list || []);
  }
  async loadTipos() {
    const list = await firstValueFrom(
      this.api.get<TipoGestion[]>("/gestion/tipo-gestiones")
    );
    this.tipos.set(list || []);
  }

  async reload() {
    await this.load();
  }

  toggleFilters() {
    this.filtersOpen = !this.filtersOpen;
  }

  clearFilters() {
    this.filtros = {};
    this.setDefaultDateFilters();
    this.reload();
  }

  hasAnyFilter() {
    const f = this.filtros;
    return !!(f.desde || f.hasta || f.idTipoGestion || f.estado);
  }

  private setDefaultDateFilters() {
    // Desde el primer día del mes hasta hoy (YYYY-MM-DD)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    if (!this.filtros.desde) this.filtros.desde = toDate(start);
    if (!this.filtros.hasta) this.filtros.hasta = toDate(now);
  }

  applyFilters() {
    this.reload();
  }
  async loadEmpleadosIfAllowed() {
  // Solo Admin/Supervisor necesitan catálogo de tecnicos
    const isAdmin = this.auth.hasRole('Administrador');
    const isSupervisor = this.auth.hasRole('Supervisor');
    if (!(isAdmin || isSupervisor)) { this.empleados.set([]); return; }
  // Cargar tipos de empleado para poder filtrar por Tecnico
    try {
      const tipos = await firstValueFrom(this.api.get<EmpleadoTipo[]>("/gestion/empleado-tipos"));
      this.empleadoTipos.set(tipos || []);
    } catch { this.empleadoTipos.set([]); }

    if (isSupervisor && !isAdmin) {
  // Supervisores: solo sus tecnicos
      const list = await firstValueFrom(this.api.get<Empleado[]>("/gestion/empleados/mis-tecnicos"));
      this.empleados.set((list || []).filter(e => this.isTecnicoTipo(e.idEmpleadoTipo)));
    } else {
  // Admin: todos los empleados, pero mostrar sólo tecnicos
      const list = await firstValueFrom(this.api.get<Empleado[]>("/gestion/empleados"));
      this.empleados.set((list || []).filter(e => this.isTecnicoTipo(e.idEmpleadoTipo)));
    }
  }
  async loadClientesIfAllowed() {
    // Solo Admin/Supervisor pueden listar clientes
    if (this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor")) {
      const list = await firstValueFrom(
        this.api.get<any[]>("/gestion/clientes")
      );
      const lite = (list || []).map((c) => ({ id: c.id, nombre: c.nombre, nit: c.nit }));
      this.clientes.set(lite);
    } else {
      this.clientes.set([]);
    }
  }

  async loadSelfClienteIfClienteRole() {
    if (this.auth.hasRole("Cliente")) {
      try {
        const self = await firstValueFrom(this.api.get<any>("/gestion/clientes/self"));
        this.selfCliente = self?.id ? self : undefined;
      } catch {}
    }
  }

  private empleadoTipoNombre(id?: number): string {
    if (!id) return '';
    return this.empleadoTipos().find(t => t.id === id)?.nombre || '';
  }
  private isTecnicoTipo(idTipo?: number): boolean {
    const name = (this.empleadoTipoNombre(idTipo) || '').toLowerCase();
  return name.includes('tecnico') || name.includes('tecnico');
  }

  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Gestión");
    this.draft = {
      idCliente: 0,
      idTipoGestion: this.tipos()[0]?.id || 0,
      direccion: "",
      // fecha por defecto ahora
      fechaProgramada: this.defaultFechaProgramada(),
    } as any;
    // Si es Cliente, obtener su cliente propio y setear idCliente; si no tiene, redirigir a completar datos
    if (this.auth.hasRole("Cliente")) {
      this.api
        .get<any>("/gestion/clientes/self")
        .toPromise()
        .then((self) => {
          if (self?.id) {
            this.selfCliente = self;
            this.draft.idCliente = self.id;
            // completar datos del cliente
            this.draft.latitud = self.latitud ?? undefined;
            this.draft.longitud = self.longitud ?? undefined;
            this.draft.direccion = self.direccion ?? "";
            this.modalOpen.set(true);
          } else {
            this.router.navigateByUrl("/app/gestion/mi-cliente");
          }
        })
        .catch(() => {
          this.router.navigateByUrl("/app/gestion/mi-cliente");
        });
      return;
    }
    this.modalOpen.set(true);
  }

  defaultFechaProgramada() {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const mi = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  onMapChanged(ev: { lat: number; lng: number }) {
    this.draft.latitud = String(ev.lat);
    this.draft.longitud = String(ev.lng);
  }

  clienteNombreNit() {
    const c = this.clientes().find((x) => x.id === this.draft.idCliente);
    if (!c) return `${this.draft.idCliente}`;
    return `${c.nombre}${c.nit ? " (" + c.nit + ")" : ""}`;
  }

  clienteNombreNitById(id?: number) {
    if (!id) return "";
    // Si es rol Cliente y corresponde a su propio cliente
    if (this.auth.hasRole("Cliente") && this.selfCliente?.id === id) {
      const c = this.selfCliente;
      return `${c.nombre}${c.nit ? " (" + c.nit + ")" : ""}`;
    }
    // Si hay catálogo de clientes cargado (Admin/Supervisor)
    const c = this.clientes().find((x) => x.id === id);
    if (c) return `${c.nombre}${c.nit ? " (" + c.nit + ")" : ""}`;
    // Fallback: mostrar ID
    return `${id}`;
  }

  clienteNombreById(id?: number) {
    if (!id) return "";
    if (this.auth.hasRole("Cliente") && this.selfCliente?.id === id) {
      return this.selfCliente?.nombre || "";
    }
    const c = this.clientes().find((x) => x.id === id);
    return c?.nombre || "";
  }

  clienteNitById(id?: number) {
    if (!id) return "";
    if (this.auth.hasRole("Cliente") && this.selfCliente?.id === id) {
      return this.selfCliente?.nit || "";
    }
    const c = this.clientes().find((x) => x.id === id);
    return c?.nit || "";
  }

  async onClienteChange(id: number) {
    if (!id) return;
    // traer datos del cliente y prellenar direccion/coords
    const c = await firstValueFrom(this.api.get<any>(`/gestion/clientes/${id}`));
    this.draft.direccion = c?.direccion || "";
    this.draft.latitud = c?.latitud ?? undefined;
    this.draft.longitud = c?.longitud ?? undefined;
  }
  openEdit(g: Gestion) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Gestión");
    this.draft = { ...g };
    this.setCreatorNombreFromDraft();
    this.modalOpen.set(true);
  }
  openView(g: Gestion) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Gestión");
    this.draft = { ...g };
    this.setCreatorNombreFromDraft();
    this.modalOpen.set(true);
  }
  openAsignacion(g: Gestion) {
    if (!this.canAsignar()) return;
    this.draft = { ...g };
    this.asignacionDraft = {
      idTecnico: g.idTecnico,
      fechaInicio: g.fechaInicio,
      fechaFin: g.fechaFin,
    };
    this.asignacionOpen.set(true);
  }
  closeAsignacion() {
    this.asignacionOpen.set(false);
  }
  async saveAsignacion() {
    if (!this.draft.id) return;
    const payload: any = {
      idTecnico: this.asignacionDraft.idTecnico,
      fechaInicio: this.asignacionDraft.fechaInicio,
      fechaFin: this.asignacionDraft.fechaFin,
    };
    await firstValueFrom(
      this.api.patch(`/gestion/gestiones/${this.draft.id}/asignacion`, payload)
    );
    await this.load();
    this.closeAsignacion();
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    // Sanear payload para cumplir con DTO del backend
    // Validación: Admin/Supervisor deben seleccionar un cliente
    if (
      (this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor")) &&
      (!this.draft.idCliente || this.draft.idCliente === 0)
    ) {
      this.notify.warning("Selecciona un cliente");
      return;
    }
    const payload = {
      idCliente: this.draft.idCliente,
      idTecnico: this.draft.idTecnico,
      idTipoGestion: this.draft.idTipoGestion,
      direccion: this.draft.direccion?.trim(),
      latitud: this.draft.latitud?.trim() || undefined,
      longitud: this.draft.longitud?.trim() || undefined,
      fechaProgramada: this.draft.fechaProgramada || undefined,
      observaciones: this.draft.observaciones?.trim() || undefined,
      estado: this.draft.estado?.trim() || undefined,
    } as Partial<Gestion>;

    if (this.modalMode() === "create") {
      await firstValueFrom(this.api.post("/gestion/gestiones", payload));
    } else if (this.modalMode() === "edit" && this.draft.id) {
      await firstValueFrom(
        this.api.patch(`/gestion/gestiones/${this.draft.id}`, payload)
      );
    }
    await this.load();
    this.closeModal();
  }
  async remove(g: Gestion) {
    if (!g.id) return;
    if (!confirm("¿Eliminar gestión?")) return;
    await firstValueFrom(this.api.delete(`/gestion/gestiones/${g.id}`));
    await this.load();
  }

  private async setCreatorNombreFromDraft() {
    this.creatorNombre.set(null);
    const id = this.draft.idUsuarioCreador;
    if (!id) return;
    const cached = this.usuarioCache.get(id);
    if (cached) { this.creatorNombre.set(cached); return; }
    try {
      const u = await firstValueFrom(this.api.get<Usuario>(`/usuarios/${id}`));
      const display = (u?.nombre?.trim() || u?.username || `ID ${id}`).toString();
      this.usuarioCache.set(id, display);
      this.creatorNombre.set(display);
    } catch {
      this.creatorNombre.set(null);
    }
  }
}
