import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { AuthService } from "../../../core/auth.service";
import { ModalComponent } from "../../../shared/modal/modal.component";
import { ActionMenuComponent } from "../../../shared/action-menu/action-menu.component";
import { firstValueFrom } from "rxjs";
import {
  ChangePasswordDialogComponent,
  ChangePasswordPayload,
} from "../../../shared/change-password-dialog/change-password-dialog.component";

interface Usuario {
  id?: number;
  username: string;
  email?: string;
  nombre?: string;
  activo?: boolean;
}
interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
}

@Component({
  standalone: true,
  selector: "app-usuarios-page",
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    ActionMenuComponent,
    ChangePasswordDialogComponent,
  ],
  templateUrl: "./usuarios-page.component.html",
  styleUrls: ["./usuarios-page.component.css"],
})
export class UsuariosPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  usuarios = signal<Usuario[]>([]);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Usuario = { username: "", nombre: "", email: "", activo: true };
  // Roles
  allRoles = signal<Rol[]>([]);
  currentUser = signal<Usuario | null>(null);
  currentUserRoleNames = signal<string[]>([]);
  rolesModalOpen = signal(false);
  rolesModalTitle = signal("");
  // mapa de roles por usuario (username o id -> nombres de roles)
  private userRolesMap = new Map<number, string[]>();
  // UI cambio de contraseña
  changePwdOpen = signal(false);
  changePwdUser: Usuario | null = null;

  canEdit() {
    return this.auth.hasRole("Administrador");
  }
  canDelete() {
    return this.auth.hasRole("Administrador");
  }

  async ngOnInit() {
    await Promise.all([this.load(), this.loadAllRoles()]);
  }
  async load() {
    const list = await firstValueFrom(this.api.get<Usuario[]>("/usuarios"));
    this.usuarios.set(list || []);
    // precargar roles por usuario para visualización en tabla
    await this.preloadRolesForUsers();
  }
  async loadAllRoles() {
    const list = await firstValueFrom(this.api.get<Rol[]>("/roles"));
    this.allRoles.set(list || []);
  }
  openCreate() {
    this.modalMode.set("create");
    this.modalTitle.set("Crear Usuario");
    this.draft = { username: "", nombre: "", email: "", activo: true };
    this.modalOpen.set(true);
  }
  openEdit(u: Usuario) {
    this.modalMode.set("edit");
    this.modalTitle.set("Modificar Usuario");
    this.draft = { ...u };
    this.modalOpen.set(true);
  }
  openView(u: Usuario) {
    this.modalMode.set("view");
    this.modalTitle.set("Ver Usuario");
    this.draft = { ...u };
    this.modalOpen.set(true);
  }
  closeModal() {
    this.modalOpen.set(false);
  }
  async save() {
    if (this.modalMode() === "create") {
      const body: any = {
        username: this.draft.username,
        nombre: this.draft.nombre,
        email: this.draft.email,
        password: "Temporal123*",
      };
      await firstValueFrom(this.api.post("/usuarios", body));
    } else if (this.modalMode() === "edit" && this.draft.id) {
      const { id, username, ...rest } = this.draft as Required<Usuario>;
      await firstValueFrom(this.api.patch(`/usuarios/${id}`, rest));
    }
    await this.load();
    this.closeModal();
  }
  async remove(u: Usuario) {
    if (!u.id) return;
    if (!confirm("¿Eliminar usuario?")) return;
    await firstValueFrom(this.api.delete(`/usuarios/${u.id}`));
    await this.load();
  }

  // Cambiar contraseña (usa endpoint que opera sobre el usuario autenticado)
  openChangePassword(u: Usuario) {
    // Permitir si es el mismo usuario autenticado o si es Administrador
    const me = this.auth.userSig();
    const isSelf = me?.username && u.username && me.username === u.username;
    if (!isSelf && !this.canEdit()) return;
    this.changePwdUser = u;
    this.changePwdOpen.set(true);
  }
  closeChangePassword() {
    this.changePwdOpen.set(false);
    this.changePwdUser = null;
  }
  async submitChangePassword(payload: ChangePasswordPayload) {
    try {
      await firstValueFrom(this.api.post(`/usuarios/change-password`, payload));
      alert("Contraseña actualizada correctamente");
      this.closeChangePassword();
    } catch (e: any) {
      alert(e?.error?.message || "Error cambiando la contraseña");
    }
  }

  // Roles UI
  async openRoles(u: Usuario) {
    if (!u.id) return;
    this.currentUser.set(u);
    this.rolesModalTitle.set(`Roles de ${u.username}`);
    const names = await firstValueFrom(
      this.api.get<string[]>(`/usuarios/${u.id}/roles`)
    );
    this.currentUserRoleNames.set(names || []);
    if (this.allRoles().length === 0) await this.loadAllRoles();
    this.rolesModalOpen.set(true);
  }
  closeRolesModal() {
    this.rolesModalOpen.set(false);
    this.currentUser.set(null);
    this.currentUserRoleNames.set([]);
  }
  assignedRoles() {
    return this.allRoles().filter((r) =>
      this.currentUserRoleNames().includes(r.nombre)
    );
  }
  availableRoles() {
    return this.allRoles().filter(
      (r) => !this.currentUserRoleNames().includes(r.nombre)
    );
  }
  async assignRoleToCurrent(r: Rol) {
    const u = this.currentUser();
    if (!u?.id) return;
    await firstValueFrom(
      this.api.post("/usuarios/assign-role", { idUsuario: u.id, idRol: r.id })
    );
    await this.refreshUserRoles(u.id);
  }
  async removeRoleFromCurrent(r: Rol) {
    const u = this.currentUser();
    if (!u?.id) return;
    await firstValueFrom(this.api.delete(`/usuarios/${u.id}/roles/${r.id}`));
    await this.refreshUserRoles(u.id);
  }
  private async refreshUserRoles(userId: number) {
    const names = await firstValueFrom(
      this.api.get<string[]>(`/usuarios/${userId}/roles`)
    );
    this.currentUserRoleNames.set(names || []);
    this.userRolesMap.set(userId, names || []);
  }

  private async preloadRolesForUsers() {
    const users = this.usuarios();
    // Ejecutar en serie para no saturar; si prefieres paralelo, usar Promise.all con límite
    for (const u of users) {
      if (!u.id) continue;
      try {
        const names = await firstValueFrom(
          this.api.get<string[]>(`/usuarios/${u.id}/roles`)
        );
        this.userRolesMap.set(u.id, names || []);
      } catch {
        this.userRolesMap.set(u.id, []);
      }
    }
  }

  rolesFor(u: Usuario): string[] | undefined {
    if (!u.id) return undefined;
    return this.userRolesMap.get(u.id);
  }
}
