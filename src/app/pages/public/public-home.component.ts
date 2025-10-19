import { Component } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { NgIf } from "@angular/common";
import { AuthService } from "../../core/auth.service";
import { environment } from "../../environments/environment";

@Component({
  standalone: true,
  selector: "app-public-home",
  imports: [RouterLink, NgIf],
  templateUrl: "./public-home.component.html",
  styleUrls: ["./public-home.component.css"],
})
export class PublicHomeComponent {
  isDev = !environment.production;

  constructor(private auth: AuthService, private router: Router) {}

  loginAsAdmin() {
    this.auth.login("admin", "dev-token", ["Administrador"]);
    this.router.navigateByUrl("/app");
  }

  loginAsSupervisor() {
    this.auth.login("supervisor", "dev-token", ["Supervisor"]);
    this.router.navigateByUrl("/app");
  }

  loginAsTecnico() {
    this.auth.login("tecnico", "dev-token", ["Técnico"]);
    this.router.navigateByUrl("/app");
  }

  loginAsCliente() {
    this.auth.login("cliente", "dev-token", ["Cliente"]);
    this.router.navigateByUrl("/app");
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl("/");
  }
}
