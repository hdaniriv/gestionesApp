import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  standalone: true,
  selector: "app-modal",
  imports: [CommonModule],
  templateUrl: "./modal.component.html",
  styleUrls: ["./modal.component.css"],
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = "";
  @Output() close = new EventEmitter<void>();
  backdrop(_e: Event) {
    this.close.emit();
  }
}
