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
}

interface EmpleadoTipo {
  id: number;
  nombre: string;
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
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Empleado = { nombres: "", apellidos: "", idEmpleadoTipo: 0 };

  empleadoTipoNombre(id: number) {
    return this.tipos().find((t) => t.id === id)?.nombre || id;
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
    await Promise.all([this.loadTipos(), this.load()]);
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
    this.modalOpen.set(true);
  }
  openView(e: Empleado) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Empleado");
    this.draft = { ...e };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    if (this.modalMode() === "create") {
      await firstValueFrom(this.api.post("/gestion/empleados", this.draft));
    } else if (this.modalMode() === "edit" && this.draft.id) {
      const { id, ...body } = this.draft as Required<Empleado>;
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
}
