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
import { NotifyService } from "../../../shared/notify/notify.service";
import {
  ResetPasswordDialogComponent,
  ResetPasswordPayload,
} from "../../../shared/reset-password-dialog/reset-password-dialog.component";

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
    ResetPasswordDialogComponent,
  ],
  templateUrl: "./usuarios-page.component.html",
  styleUrls: ["./usuarios-page.component.css"],
})
export class UsuariosPageComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private notify = inject(NotifyService);
  usuarios = signal<Usuario[]>([]);
  modalOpen = signal(false);
  modalMode = signal<"create" | "edit" | "view">("create");
  modalTitle = signal("");
  draft: Usuario = { username: "", nombre: "", email: "", activo: true };
  // Campos exclusivos para creación
  createPassword = "";
  createPassword2 = "";
  createRoleId: number | null = null;
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
  // Reset password (solo admin desde pantalla Usuarios)
  resetPwdOpen = signal(false);
  resetPwdUser: Usuario | null = null;

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
    this.createPassword = "";
    this.createPassword2 = "";
    this.createRoleId = null;
    // abrir en el siguiente tick para evitar autocompletado agresivo
    setTimeout(() => this.modalOpen.set(true), 0);
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
    this.createPassword = "";
    this.createPassword2 = "";
    this.createRoleId = null;
  }
  canSubmitCreate() {
    return (
      (this.draft.username?.trim().length || 0) >= 3 &&
      this.createPassword.length >= 6 &&
      this.createPassword === this.createPassword2 &&
      !!this.createRoleId
    );
  }
  async save() {
    if (this.modalMode() === "create") {
      if (!this.canSubmitCreate()) {
        this.notify.warning(
          "Completa los datos: usuario, contraseña y rol (las contraseñas deben coincidir)"
        );
        return;
      }
      try {
        const body: any = {
          username: this.draft.username?.trim(),
          nombre: this.draft.nombre?.trim(),
          email: this.draft.email?.trim(),
          password: this.createPassword,
        };
        const created = await firstValueFrom(this.api.post<Usuario & { id: number }>("/usuarios", body));
        // Asignar rol obligatorio dentro de un try/catch separado para reportar claro
        try {
          await firstValueFrom(
            this.api.post("/usuarios/assign-role", {
              idUsuario: created.id,
              idRol: this.createRoleId,
            })
          );
          this.notify.success("Usuario creado y rol asignado");
        } catch (e: any) {
          this.notify.warning(
            e?.error?.message || "Usuario creado, pero falló la asignación de rol"
          );
        }
      } catch (e: any) {
        this.notify.error(e?.error?.message || "Error al crear usuario");
        return;
      }
    } else if (this.modalMode() === "edit" && this.draft.id) {
      try {
        const { id, username, ...rest } = this.draft as Required<Usuario>;
        await firstValueFrom(this.api.patch(`/usuarios/${id}`, rest));
        this.notify.success("Usuario actualizado");
      } catch (e: any) {
        this.notify.error(e?.error?.message || "Error al actualizar usuario");
        return;
      }
    }
    await this.load();
    this.closeModal();
  }
  async remove(u: Usuario) {
    if (!u.id) return;
    const ok = await this.notify.confirm(
      `¿Eliminar al usuario ${u.username}?`,
      "Confirmar eliminación"
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(`/usuarios/${u.id}`));
      await this.load();
      this.notify.success("Usuario eliminado");
    } catch (e: any) {
      this.notify.error(e?.error?.message || "Error al eliminar usuario");
    }
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
      this.notify.success("Contraseña actualizada correctamente");
      this.closeChangePassword();
    } catch (e: any) {
      this.notify.error(
        e?.error?.message || "Error cambiando la contraseña"
      );
    }
  }

  // Reset password (admin -> usuario seleccionado)
  openResetPassword(u: Usuario) {
    if (!this.canEdit()) return;
    this.resetPwdUser = u;
    this.resetPwdOpen.set(true);
  }
  closeResetPassword() {
    this.resetPwdOpen.set(false);
    this.resetPwdUser = null;
  }
  async submitResetPassword(payload: ResetPasswordPayload) {
    const u = this.resetPwdUser;
    if (!u?.id) return;
    try {
      await firstValueFrom(
        this.api.post(`/usuarios/${u.id}/reset-password`, payload)
      );
      this.notify.success(`Contraseña reseteada para ${u.username}`);
      this.closeResetPassword();
    } catch (e: any) {
      this.notify.error(
        e?.error?.message || "Error reseteando la contraseña"
      );
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
