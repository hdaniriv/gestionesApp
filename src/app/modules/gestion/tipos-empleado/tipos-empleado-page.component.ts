import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";

interface TipoEmpleado {
  id?: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  standalone: true,
  selector: "app-tipos-empleado-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent],
  templateUrl: "./tipos-empleado-page.component.html",
  styleUrls: ["./tipos-empleado-page.component.css"],
})
export class TiposEmpleadoPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  tipos = signal<TipoEmpleado[]>([]);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: TipoEmpleado = { nombre: "", descripcion: "" };

  canEdit() {
    return (
      this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor")
    );
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  async ngOnInit() {
    await this.load();
  }
  async load() {
    const list = await firstValueFrom(
      this.api.get<TipoEmpleado[]>("/gestion/empleado-tipos")
    );
    this.tipos.set(list || []);
  }
  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Tipo de Empleado");
    this.draft = { nombre: "", descripcion: "" };
    this.modalOpen.set(true);
  }
  openEdit(t: TipoEmpleado) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Tipo de Empleado");
    this.draft = { ...t };
    this.modalOpen.set(true);
  }
  openView(t: TipoEmpleado) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Tipo de Empleado");
    this.draft = { ...t };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    if (this.modalMode() === "create") {
      await firstValueFrom(
        this.api.post("/gestion/empleado-tipos", {
          nombre: this.draft.nombre,
          descripcion: this.draft.descripcion,
        })
      );
    } else if (this.modalMode() === "edit" && this.draft.id) {
      await firstValueFrom(
        this.api.patch(`/gestion/empleado-tipos/${this.draft.id}`, {
          nombre: this.draft.nombre,
          descripcion: this.draft.descripcion,
        })
      );
    }
    await this.load();
    this.closeModal();
  }
  async remove(t: TipoEmpleado) {
    if (!t.id) return;
    if (!confirm("¿Eliminar tipo de empleado?")) return;
    await firstValueFrom(this.api.delete(`/gestion/empleado-tipos/${t.id}`));
    await this.load();
  }
}
