import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { NotifyService } from "../../shared/notify/notify.service";

@Component({
  standalone: true,
  selector: "app-register",
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterComponent {
  private api = inject(ApiService);
  private notify = inject(NotifyService);
  private router = inject(Router);

  username = "";
  email = "";
  nombre = "";
  password = "";
  confirm = "";
  loading = signal(false);

  get valid() {
    const userOk = (this.username?.trim().length || 0) >= 3;
    const passOk = (this.password?.length || 0) >= 6 && this.password === this.confirm;
    return userOk && passOk;
  }

  async submit() {
    if (!this.valid) {
      this.notify.warning("Revisa los campos: usuario y contraseña son obligatorios");
      return;
    }
    this.loading.set(true);
    try {
      const body: any = {
        username: this.username.trim().toLowerCase(),
        password: this.password,
      };
      if (this.email?.trim()) body.email = this.email.trim().toLowerCase();
      if (this.nombre?.trim()) body.nombre = this.nombre.trim();

      await this.api.post("/public/register/cliente", body).toPromise();
      this.router.navigate(["/login"], {
        state: {
          flash: {
            type: "success",
            text: "Cuenta creada correctamente. Inicia sesión para continuar.",
          },
          username: this.username.trim().toLowerCase(),
        },
      });
    } catch (e: any) {
      const msg = e?.error?.message || "No se pudo crear la cuenta";
      this.notify.error(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
