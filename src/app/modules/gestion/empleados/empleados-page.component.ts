import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";

interface Empleado {
  id?: number;
  nombres: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  idEmpleadoTipo: number;
  idUsuario?: number;
  // Auditoría (solo lectura)
  fechaCreacion?: string | Date;
  fechaModificacion?: string | Date;
  idUsuarioCreador?: number;
}

interface EmpleadoTipo {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  username: string;
  email?: string;
  nombre?: string; // nombre completo opcional
}

@Component({
  standalone: true,
  selector: "app-empleados-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent],
  templateUrl: "./empleados-page.component.html",
  styleUrls: ["./empleados-page.component.css"],
})
export class EmpleadosPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  empleados = signal<Empleado[]>([]);
  tipos = signal<EmpleadoTipo[]>([]);
  usuarios = signal<Usuario[]>([]);
  loadingUsuarios = signal<boolean>(false);
  // Nombre mostrado del usuario creador del registro actual
  creatorNombre = signal<string | null>(null);
  private usuarioCache = new Map<number, string>();
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Empleado = { nombres: "", apellidos: "", idEmpleadoTipo: 0 };
  asignacionOpen = signal(false);
  asignacionSupervisor?: Empleado;
  tecnicos = signal<Empleado[]>([]);
  seleccionTecnicos = new Set<number>();

  empleadoTipoNombre(id: number): string {
    const n = this.tipos().find((t) => t.id === id)?.nombre;
    return n ?? String(id);
  }
  
  usuarioNombre(idUsuario?: number | null): string {
    if (!idUsuario) return "-";
    const usuario = this.usuarios().find((u) => u.id === idUsuario);
    if (!usuario) return `Usuario ${idUsuario}`;
    // Priorizar nombre completo si existe, si no usar username
    return usuario.nombre?.trim() || usuario.username;
  }
  isSupervisorTipo(idTipo: number){
    const name = this.empleadoTipoNombre(idTipo).toLowerCase();
    return name.includes('supervisor');
  }
  isTecnicoTipo(idTipo: number){
    const name = this.empleadoTipoNombre(idTipo).toLowerCase();
    return name.includes('técnico') || name.includes('tecnico');
  }
  canEdit() {
    return (
      this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor")
    );
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  async ngOnInit() {
    await this.loadTipos();
    await this.loadUsuarios();
    await this.load();
  }
  async load() {
    const list = await firstValueFrom(
      this.api.get<Empleado[]>("/gestion/empleados")
    );
    this.empleados.set(list || []);
  }
  async loadTipos() {
    const list = await firstValueFrom(
      this.api.get<EmpleadoTipo[]>("/gestion/empleado-tipos")
    );
    this.tipos.set(list || []);
  }
  
  async loadUsuarios() {
    try {
      this.loadingUsuarios.set(true);
      const list = await firstValueFrom(
        // Usuarios vienen del microservicio principal (sistema) bajo /api
        this.api.get<Usuario[]>("/usuarios/active")
      );
      this.usuarios.set(list || []);
    } catch (error) {
      console.warn("No se pudieron cargar los usuarios:", error);
      this.usuarios.set([]);
    } finally {
      this.loadingUsuarios.set(false);
    }
  }
  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Empleado");
    this.draft = {
      nombres: "",
      apellidos: "",
      idEmpleadoTipo: this.tipos()[0]?.id || 0,
    };
    this.modalOpen.set(true);
  }
  openEdit(e: Empleado) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Empleado");
    this.draft = { ...e };
    this.setCreatorNombreFromDraft();
    this.modalOpen.set(true);
  }
  openView(e: Empleado) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Empleado");
    this.draft = { ...e };
    this.setCreatorNombreFromDraft();
    this.modalOpen.set(true);
  }
  async openAsignar(e: Empleado) {
    // Solo si es supervisor
  if (!this.isSupervisorTipo(e.idEmpleadoTipo)) return;
    this.asignacionSupervisor = e;
    const all = this.empleados();
  const tecnicos = all.filter(x => this.isTecnicoTipo(x.idEmpleadoTipo));
    this.tecnicos.set(tecnicos);
    // Cargar seleccion actual
    const rels = await firstValueFrom(this.api.get<any[]>(`/gestion/supervisores-tecnicos/supervisor/${e.id}`));
    this.seleccionTecnicos = new Set<number>(rels.map(r => r.idTecnico));
    this.asignacionOpen.set(true);
  }
  closeAsignar(){ this.asignacionOpen.set(false); }
  toggleTecnico(id: number, checked: boolean){
    if (checked) this.seleccionTecnicos.add(id); else this.seleccionTecnicos.delete(id);
  }
  async saveAsignaciones(){
    if (!this.asignacionSupervisor?.id) return;
    const idSupervisor = this.asignacionSupervisor.id;
    // Regla: Al reasignar, borramos todas las actuales y creamos las seleccionadas
    await firstValueFrom(this.api.delete(`/gestion/supervisores-tecnicos/supervisor/${idSupervisor}`));
    const ids = Array.from(this.seleccionTecnicos);
    for (const idTecnico of ids){
      await firstValueFrom(this.api.post(`/gestion/supervisores-tecnicos`, { idSupervisor, idTecnico }));
    }
    this.asignacionOpen.set(false);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    const buildPayload = (e: Empleado) => ({
      nombres: e.nombres,
      apellidos: e.apellidos,
      telefono: e.telefono,
      direccion: e.direccion,
      idEmpleadoTipo: e.idEmpleadoTipo,
      idUsuario: e.idUsuario ?? null,
    });

    if (this.modalMode() === "create") {
      const body = buildPayload(this.draft);
      await firstValueFrom(this.api.post("/gestion/empleados", body));
    } else if (this.modalMode() === "edit" && this.draft.id) {
      const { id } = this.draft as Required<Empleado>;
      const body = buildPayload(this.draft);
      await firstValueFrom(this.api.patch(`/gestion/empleados/${id}`, body));
    }
    await this.load();
    this.closeModal();
  }
  async remove(e: Empleado) {
    if (!e.id) return;
    if (!confirm("¿Eliminar empleado?")) return;
    await firstValueFrom(this.api.delete(`/gestion/empleados/${e.id}`));
    await this.load();
  }

  private async setCreatorNombreFromDraft() {
    this.creatorNombre.set(null);
    const id = this.draft.idUsuarioCreador;
    if (!id) return;
    // caché local para evitar múltiples llamadas
    const cached = this.usuarioCache.get(id);
    if (cached) {
      this.creatorNombre.set(cached);
      return;
    }
    try {
      const u = await firstValueFrom(this.api.get<Usuario>(`/usuarios/${id}`));
      const display = (u?.nombre?.trim() || u?.username || `ID ${id}`).toString();
      this.usuarioCache.set(id, display);
      this.creatorNombre.set(display);
    } catch {
      // fallback a ID si falla
      this.creatorNombre.set(null);
    }
  }
}
