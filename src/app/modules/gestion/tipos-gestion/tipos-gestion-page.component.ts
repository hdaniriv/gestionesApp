import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";

interface TipoGestion {
  id?: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  standalone: true,
  selector: "app-tipos-gestion-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent],
  templateUrl: "./tipos-gestion-page.component.html",
  styleUrls: ["./tipos-gestion-page.component.css"],
})
export class TiposGestionPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  tipos = signal<TipoGestion[]>([]);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: TipoGestion = { nombre: "", descripcion: "" };

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
    const list = await this.api
      .get<TipoGestion[]>("/gestion/tipo-gestiones")
      .toPromise();
    this.tipos.set(list || []);
  }
  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Tipo de Gestión");
    this.draft = { nombre: "", descripcion: "" };
    this.modalOpen.set(true);
  }
  openEdit(t: TipoGestion) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Tipo de Gestión");
    this.draft = { ...t };
    this.modalOpen.set(true);
  }
  openView(t: TipoGestion) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Tipo de Gestión");
    this.draft = { ...t };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    if (this.modalMode() === "create") {
      await this.api
        .post("/gestion/tipo-gestiones", {
          nombre: this.draft.nombre,
          descripcion: this.draft.descripcion,
        })
        .toPromise();
    } else if (this.modalMode() === "edit" && this.draft.id) {
      await this.api
        .patch(`/gestion/tipo-gestiones/${this.draft.id}`, {
          nombre: this.draft.nombre,
          descripcion: this.draft.descripcion,
        })
        .toPromise();
    }
    await this.load();
    this.closeModal();
  }
  async remove(t: TipoGestion) {
    if (!t.id) return;
    if (!confirm("¿Eliminar tipo de gestión?")) return;
    await this.api.delete(`/gestion/tipo-gestiones/${t.id}`).toPromise();
    await this.load();
  }
}
