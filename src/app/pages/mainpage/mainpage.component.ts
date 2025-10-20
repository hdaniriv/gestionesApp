import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from "@angular/core";
import { Router, RouterLink, RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../core/auth.service";
import { FormsModule } from "@angular/forms";
import {
  ChangePasswordDialogComponent,
  ChangePasswordPayload,
} from "../../shared/change-password-dialog/change-password-dialog.component";
import { ApiService } from "../../core/api.service";
import { NotifyService } from "../../shared/notify/notify.service";

@Component({
  standalone: true,
  selector: "app-mainpage",
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    FormsModule,
    ChangePasswordDialogComponent,
  ],
  templateUrl: "./mainpage.component.html",
  styleUrls: ["./mainpage.component.css"],
})
export class mainpageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  username = computed(() => this.auth.userSig()?.username || "");
  roles = computed(() => this.auth.userSig()?.roles || []);
  sidebarOpen = signal(false);
  isAdmin = computed(() => this.auth.hasRole("Administrador"));
  isSupervisor = computed(() => this.auth.hasRole("Supervisor"));
  isTecnico = computed(() => this.auth.hasRole("Técnico"));
  isCliente = computed(() => this.auth.hasRole("Cliente"));

  // Menú de usuario
  userMenuOpen = signal(false);
  toggleUserMenu(ev: Event) {
    ev.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }
  @HostListener("document:click")
  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  logout(ev: Event) {
    ev.preventDefault();
    this.auth.logout();
    this.router.navigateByUrl("/");
  }
  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }
  // Visibilidad por rol: Admin y Supervisor ven todo; Técnico/Cliente solo Gestiones
  showGestion() {
    return (
      this.isAdmin() ||
      this.isSupervisor() ||
      this.isTecnico() ||
      this.isCliente()
    );
  }
  showAdmin() {
    return this.isAdmin() || this.isSupervisor();
  }
  showUsuarios() {
    return this.isAdmin();
  }
  showRoles() {
    return this.isAdmin() || this.isSupervisor();
  }

  async refresh() {
    const ok = await this.auth.refreshTokens();
    if (!ok) {
      // Si falla el refresh, cerrar sesión de forma segura
      this.auth.logout();
    }
  }

  // Cambio de contraseña desde el menú de usuario
  changePwdOpen = signal(false);
  openChangePassword() {
    this.changePwdOpen.set(true);
    this.userMenuOpen.set(false);
  }
  closeChangePassword() {
    this.changePwdOpen.set(false);
  }
  async submitChangePassword(payload: ChangePasswordPayload) {
    try {
      await this.api.post("/usuarios/change-password", payload).toPromise();
      this.notify.success("Contraseña actualizada correctamente");
      this.closeChangePassword();
    } catch (e: any) {
      const msg = e?.error?.message || "Error cambiando la contraseña";
      this.notify.error(msg);
    }
  }
}
