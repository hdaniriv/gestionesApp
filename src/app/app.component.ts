import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NotifyContainerComponent } from "./shared/notify/notify-container.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, NotifyContainerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-notify-container></app-notify-container>
  `,
})
export class AppComponent {}
