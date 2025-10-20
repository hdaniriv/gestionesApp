import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";
import { NotifyService } from "../../../shared/notify/notify.service";
import { AuthService } from "../../../core/auth.service";
import { MapPickerComponent } from "../../../shared/map-picker/map-picker.component";

interface Cliente {
  id?: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  idUsuario?: number | null;
  usuarioUsername?: string | null;
  nit?: string;
  latitud?: number | null;
  longitud?: number | null;
}
interface UsuarioLite {
  id: number;
  username: string;
}

@Component({
  standalone: true,
  selector: "app-clientes-page",
  imports: [CommonModule, FormsModule, ModalComponent, ActionMenuComponent, MapPickerComponent],
  templateUrl: "./clientes-page.component.html",
  styleUrls: ["./clientes-page.component.css"],
})
export class ClientesPageComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private auth = inject(AuthService);

  clientes = signal<Cliente[]>([]);
  usuariosCliente = signal<UsuarioLite[]>([]);

  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Cliente = { nombre: "", telefono: "", email: "", direccion: "", idUsuario: null };

  canEdit() {
    return this.auth.hasRole("Administrador") || this.auth.hasRole("Supervisor");
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  async ngOnInit() {
    await Promise.all([this.loadClientes(), this.loadUsuariosCliente()]);
  }

  async loadClientes() {
    const list = await firstValueFrom(this.api.get<Cliente[]>("/gestion/clientes"));
    this.clientes.set(list || []);
  }
  async loadUsuariosCliente() {
    // Intentar obtener usuarios con rol Cliente. Si no hay endpoint dedicado, cargar todos y filtrar por rol en otro paso.
    try {
      const usuarios = await firstValueFrom(this.api.get<UsuarioLite[]>("/usuarios?role=Cliente"));
      this.usuariosCliente.set(usuarios || []);
    } catch {
      // fallback: tratar /usuarios y quedarnos con {id,username}; el backend puede ignorar ?role=Cliente o implementarlo luego
      const all = await firstValueFrom(this.api.get<any[]>("/usuarios"));
      const mapped = (all || [])
        .filter((u) => Array.isArray(u.roles) ? u.roles.includes("Cliente") : true)
        .map((u) => ({ id: u.id, username: u.username } as UsuarioLite));
      this.usuariosCliente.set(mapped);
    }
  }

  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Cliente");
    this.draft = { nombre: "", telefono: "", email: "", direccion: "", idUsuario: null, nit: "", latitud: null, longitud: null };
    this.modalOpen.set(true);
  }
  openEdit(c: Cliente) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Cliente");
    this.draft = { ...c };
    this.modalOpen.set(true);
  }
  openView(c: Cliente) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Cliente");
    this.draft = { ...c };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }

  private hasCoords() {
    return this.draft.latitud != null && this.draft.longitud != null;
  }
  canSubmit() {
    const base = (
      (this.draft.nombre?.trim().length || 0) >= 3 &&
      (this.draft.direccion?.trim().length || 0) >= 3 &&
      (this.draft.nit?.trim().length || 0) >= 3
    );
    if (this.modalMode() === "create") {
      return base && this.hasCoords();
    }
    return base;
  }

  async save() {
    if (!this.canSubmit()) {
      this.notify.warning("El nombre del cliente debe tener al menos 3 caracteres");
      return;
    }
    try {
      if (this.modalMode() === "create") {
        await firstValueFrom(this.api.post("/gestion/clientes", this.draft));
        this.notify.success("Cliente creado");
      } else if (this.modalMode() === "edit" && this.draft.id) {
        const { id, ...rest } = this.draft as Required<Cliente>;
        await firstValueFrom(this.api.patch(`/gestion/clientes/${id}`, rest));
        this.notify.success("Cliente actualizado");
      }
      await this.loadClientes();
      this.closeModal();
    } catch (e: any) {
      this.notify.error(e?.error?.message || "Error al guardar cliente");
    }
  }

  async remove(c: Cliente) {
    if (!c.id) return;
    const ok = await this.notify.confirm(`¿Eliminar al cliente ${c.nombre}?`, "Confirmar eliminación");
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`/gestion/clientes/${c.id}`));
      await this.loadClientes();
      this.notify.success("Cliente eliminado");
    } catch (e: any) {
      this.notify.error(e?.error?.message || "Error al eliminar cliente");
    }
  }
}
