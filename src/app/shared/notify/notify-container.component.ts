import { Component, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { NotifyService } from "./notify.service";

@Component({
  standalone: true,
  selector: "app-notify-container",
  imports: [CommonModule],
  templateUrl: "./notify-container.component.html",
  styleUrls: ["./notify-container.component.css"],
})
export class NotifyContainerComponent {
  notify = inject(NotifyService);
  list = computed(() => this.notify.messages());

  onClose(id: number) {
    this.notify.dismiss(id);
  }
  onAction(id: number, value: string) {
    this.notify.resolveAction(id, value);
  }
}
