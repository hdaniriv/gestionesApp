import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  standalone: true,
  selector: "app-public-home",
  imports: [RouterLink],
  templateUrl: "./public-home.component.html",
  styleUrls: ["./public-home.component.css"],
})
export class PublicHomeComponent {
  // Página pública sin simuladores ni dependencias adicionales
}
