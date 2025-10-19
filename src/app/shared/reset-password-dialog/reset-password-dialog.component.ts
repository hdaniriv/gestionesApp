import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ModalComponent } from "../modal/modal.component";

export interface ResetPasswordPayload {
  newPassword: string;
}

@Component({
  standalone: true,
  selector: "app-reset-password-dialog",
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: "./reset-password-dialog.component.html",
  styleUrls: ["./reset-password-dialog.component.css"],
})
export class ResetPasswordDialogComponent {
  @Input() open = false;
  @Input() title = "Resetear contraseña";
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ResetPasswordPayload>();

  newPassword = "";

  onClose() {
    this.close.emit();
    this.newPassword = "";
  }
  onSubmit() {
    this.submit.emit({ newPassword: this.newPassword });
    this.newPassword = "";
  }
}
