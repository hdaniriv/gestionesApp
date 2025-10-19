import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";

interface Gestion {
  id?: number;
  idCliente: number;
  idTecnico?: number;
  idTipoGestion: number;
  direccion: string;
  latitud?: string;
  longitud?: string;
  fechaProgramada?: string; // ISO string
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
  estado?: string;
}
interface TipoGestion {
  id: number;
  nombre: string;
}
interface Empleado {
  id: number;
  nombres: string;
  apellidos: string;
}

@Component({
  standalone: true,
  selector: "app-gestiones-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent],
  templateUrl: "./gestiones-page.component.html",
  styleUrls: ["./gestiones-page.component.css"],
})
export class GestionesPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  gestiones = signal<Gestion[]>([]);
  tipos = signal<TipoGestion[]>([]);
  empleados = signal<Empleado[]>([]);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Gestion = { idCliente: 0, idTipoGestion: 0, direccion: "" } as any;

  canCreate() {
    return (
      this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor")
    );
  }
  canEdit() {
    return (
      this.auth.hasRole("Administrador") ||
      this.auth.hasRole("Supervisor") ||
      this.auth.hasRole("Técnico")
    );
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  tipoNombre(id?: number) {
    return this.tipos().find((t) => t.id === id)?.nombre || id;
  }
  empleadoNombre(id?: number) {
    return this.empleados().find((e) => e.id === id)
      ? `${this.empleados().find((e) => e.id === id)!.nombres} ${
          this.empleados().find((e) => e.id === id)!.apellidos
        }`
      : "";
  }

  async ngOnInit() {
    await Promise.all([this.loadTipos(), this.loadEmpleados(), this.load()]);
  }
  async load() {
    const list = await firstValueFrom(
      this.api.get<Gestion[]>("/gestion/gestiones")
    );
    this.gestiones.set(list || []);
  }
  async loadTipos() {
    const list = await firstValueFrom(
      this.api.get<TipoGestion[]>("/gestion/tipo-gestiones")
    );
    this.tipos.set(list || []);
  }
  async loadEmpleados() {
    const list = await firstValueFrom(
      this.api.get<Empleado[]>("/gestion/empleados")
    );
    this.empleados.set(list || []);
  }

  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Gestión");
    this.draft = {
      idCliente: 0,
      idTipoGestion: this.tipos()[0]?.id || 0,
      direccion: "",
    } as any;
    this.modalOpen.set(true);
  }
  openEdit(g: Gestion) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Gestión");
    this.draft = { ...g };
    this.modalOpen.set(true);
  }
  openView(g: Gestion) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Gestión");
    this.draft = { ...g };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    // Sanear payload para cumplir con DTO del backend
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
}
