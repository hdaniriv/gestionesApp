import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";

interface Rol {
  id?: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  standalone: true,
  selector: "app-roles-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent],
  templateUrl: "./roles-page.component.html",
  styleUrls: ["./roles-page.component.css"],
})
export class RolesPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  roles = signal<Rol[]>([]);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Rol = { nombre: "", descripcion: "" };
  isDev = !environment.production;
  private descAreaRef: HTMLTextAreaElement | null = null;

  canEdit() {
    return this.auth.hasRole("Administrador");
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  async ngOnInit() {
    await this.load();
  }
  async load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      // eslint-disable-next-line no-console
      console.debug("[Roles] GET /roles");
      const list = await firstValueFrom(this.api.get<Rol[]>("/roles"));
      // eslint-disable-next-line no-console
      console.debug("[Roles] GET /roles OK: ", list?.length, "items");
      this.roles.set(list || []);
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message || "Error cargando roles");
      // eslint-disable-next-line no-console
      console.debug("[Roles] GET /roles FAIL: ", e);
    } finally {
      this.loading.set(false);
    }
  }
  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Rol");
    this.draft = { nombre: "", descripcion: "" };
    this.modalOpen.set(true);
    queueMicrotask(() => this.adjustTextarea());
  }
  openEdit(r: Rol) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Rol");
    // eslint-disable-next-line no-console
    console.debug("[Roles] OPEN EDIT modal");
    this.draft = { ...r };
    this.modalOpen.set(true);
    queueMicrotask(() => this.adjustTextarea());
    if (r.id) {
      this.fetchByIdWithFallback(r);
    }
  }
  openView(r: Rol) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Rol");
    // eslint-disable-next-line no-console
    console.debug("[Roles] OPEN VIEW modal");
    this.draft = { ...r };
    this.modalOpen.set(true);
    if (r.id) {
      this.fetchByIdWithFallback(r);
    }
  }

  // Autoajusta la altura del textarea de descripción al contenido
  autoResize(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }
  private adjustTextarea() {
    try {
      const area = document.querySelector(
        "app-modal textarea.auto-textarea"
      ) as HTMLTextAreaElement | null;
      if (area) {
        this.descAreaRef = area;
        area.style.overflowY = "hidden";
        area.style.resize = "none";
        area.style.height = "auto";
        area.style.height = area.scrollHeight + "px";
        area.focus();
        // Colocar el cursor al final
        const val = area.value;
        area.setSelectionRange(val.length, val.length);
      }
    } catch {
      /* no-op */
    }
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      if (this.modalMode() === "create") {
        const payload = {
          nombre: (this.draft.nombre || "").trim(),
          descripcion: (this.draft.descripcion || "").trim() || undefined,
        };
        // eslint-disable-next-line no-console
        console.debug("[Roles] POST /roles", payload);
        await firstValueFrom(this.api.post("/roles", payload));
      } else if (this.modalMode() === "edit" && this.draft.id) {
        const id = this.draft.id;
        const payload = {
          nombre: (this.draft.nombre || "").trim(),
          descripcion: (this.draft.descripcion || "").trim() || undefined,
        };
        // eslint-disable-next-line no-console
        console.debug(`[Roles] PATCH /roles/${id}`, payload);
        await firstValueFrom(this.api.patch(`/roles/${id}`, payload));
      }
      // eslint-disable-next-line no-console
      console.debug("[Roles] SAVE OK");
      await this.load();
      this.closeModal();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message || "Error guardando rol");
      alert(this.errorMsg()!);
      // eslint-disable-next-line no-console
      console.debug("[Roles] SAVE FAIL: ", e);
    } finally {
      this.loading.set(false);
    }
  }
  async remove(r: Rol) {
    if (!r.id) return;
    if (!confirm("¿Eliminar rol?")) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      // eslint-disable-next-line no-console
      console.debug(`[Roles] DELETE /roles/${r.id}`);
      await firstValueFrom(this.api.delete(`/roles/${r.id}`));
      await this.load();
    } catch (e: any) {
      this.errorMsg.set(e?.error?.message || "Error eliminando rol");
      alert(this.errorMsg()!);
      // eslint-disable-next-line no-console
      console.debug("[Roles] DELETE FAIL: ", e);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchByIdWithFallback(fallback: Rol) {
    try {
      if (!fallback.id) {
        this.draft = { ...fallback };
        return;
      }
      // eslint-disable-next-line no-console
      console.debug(`[Roles] GET /roles/${fallback.id}`);
      const rol = await firstValueFrom(
        this.api.get<Rol>(`/roles/${fallback.id}`)
      );
      // eslint-disable-next-line no-console
      console.debug(`[Roles] GET /roles/${fallback.id} OK`);
      // Limpiar a solo los campos editables conocidos
      this.draft = rol
        ? {
            id: (rol as any).id,
            nombre: (rol as any).nombre,
            descripcion: (rol as any).descripcion,
          }
        : { ...fallback };
      // eslint-disable-next-line no-console
      console.debug("[Roles] draft after fetch:", this.draft);
    } catch (e: any) {
      // No bloquear la vista si el API rechaza; usar datos locales
      // eslint-disable-next-line no-console
      console.debug(`[Roles] GET /roles/${fallback.id} FAIL: `, e);
      this.draft = { ...fallback };
      // eslint-disable-next-line no-console
      console.debug("[Roles] draft fallback:", this.draft);
    }
  }
}
