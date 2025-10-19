import { Component, computed, inject, signal } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from "../../core/auth.service";

@Component({
  standalone: true,
  selector: "app-dashboard",
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  username = computed(() => this.auth.userSig()?.username || "");
  roles = computed(() => this.auth.userSig()?.roles || []);
  sidebarOpen = signal(false);
  isAdmin = computed(() => this.auth.hasRole("Administrador"));
  isSupervisor = computed(() => this.auth.hasRole("Supervisor"));
  isTecnico = computed(() => this.auth.hasRole("Técnico"));
  isCliente = computed(() => this.auth.hasRole("Cliente"));

  logout(ev: Event) {
    ev.preventDefault();
    this.auth.logout();
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
}
