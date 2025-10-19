import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ModalComponent } from "../modal/modal.component";

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

@Component({
  standalone: true,
  selector: "app-change-password-dialog",
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: "./change-password-dialog.component.html",
  styleUrls: ["./change-password-dialog.component.css"],
})
export class ChangePasswordDialogComponent {
  @Input() open = false;
  @Input() title = "Cambiar contraseña";
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ChangePasswordPayload>();

  currentPassword = "";
  newPassword = "";

  onClose() {
    this.close.emit();
    this.currentPassword = "";
    this.newPassword = "";
  }
  onSubmit() {
    this.submit.emit({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
    });
    this.currentPassword = "";
    this.newPassword = "";
  }
}
