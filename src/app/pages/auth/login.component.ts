import { Component, ElementRef, ViewChild, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { AuthService } from "../../core/auth.service";
import { firstValueFrom } from "rxjs";
import { NotifyService } from "../../shared/notify/notify.service";

@Component({
  standalone: true,
  selector: "app-login",
  imports: [FormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent {
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;
  username = "";
  password = "";
  isHuman = false;
  showPassword = false;
  private notify = inject(NotifyService);
  constructor(
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {
    // Mostrar mensaje si viene de registro
    const nav = this.router.getCurrentNavigation();
    const flash: any = nav?.extras?.state && (nav.extras.state as any).flash;
    const passedUser: string | undefined = nav?.extras?.state && (nav.extras.state as any).username;
    if (flash?.text) {
      if (flash.type === "success") this.notify.success(flash.text);
      else if (flash.type === "warning") this.notify.warning(flash.text);
      else this.notify.info(flash.text);
    }
    if (passedUser) {
      this.username = passedUser;
      // Auto-focus en contraseña tras un tick para garantizar que la vista esté lista
      setTimeout(() => this.passwordInput?.nativeElement?.focus(), 0);
    }
  }
  async onSubmit() {
    try {
      if (!this.isHuman) {
        return; // Protector simple del submit si no marca "No soy robot"
      }
      const res: any = await firstValueFrom(
        this.api.post("/auth/login", {
          username: this.username,
          password: this.password,
        })
      );
      const token = res?.accessToken;
      const refreshToken = res?.refreshToken;
      if (token) {
        this.auth.setSessionFromTokens(token, refreshToken);
        this.router.navigateByUrl("/app");
      }
    } catch (e) {
      this.notify.error("Credenciales inválidas", "Acceso denegado");
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
}
