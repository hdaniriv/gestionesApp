import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { AuthService } from "../../core/auth.service";
import { firstValueFrom } from "rxjs";

@Component({
  standalone: true,
  selector: "app-login",
  imports: [FormsModule, RouterLink],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent {
  username = "";
  password = "";
  isHuman = false;
  showPassword = false;
  constructor(
    private router: Router,
    private api: ApiService,
    private auth: AuthService
  ) {}
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
      alert("Credenciales inválidas");
    }
  }

  toggleShowPassword() {
    this.showPassword = !this.showPassword;
  }
}
