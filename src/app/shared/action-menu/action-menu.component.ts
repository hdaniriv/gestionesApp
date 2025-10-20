import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  standalone: true,
  selector: "app-action-menu",
  imports: [CommonModule],
  templateUrl: "./action-menu.component.html",
  styleUrls: ["./action-menu.component.css"],
})
export class ActionMenuComponent {
  @Input() canView = true;
  @Input() canEdit = false;
  @Input() canDelete = false;
  @Input() canAssign = false;
  // Acción opcional: asignar técnicos (pantalla Empleados)
  @Input() canAssignTecnicos = false;
  // Acción opcional exclusiva para la pantalla de Usuarios
  @Input() canRoles = false;
  // Acción opcional: cambiar contraseña (p.ej., para el usuario actual)
  @Input() canChangePassword = false;
  // Acción opcional: resetear contraseña (solo admin en pantalla Usuarios)
  @Input() canResetPassword = false;
  @Output() view = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() assign = new EventEmitter<void>();
  @Output() assignTecnicos = new EventEmitter<void>();
  @Output() roles = new EventEmitter<void>();
  @Output() changePassword = new EventEmitter<void>();
  @Output() resetPassword = new EventEmitter<void>();

  open = false;
  menuTop = 0;
  menuLeft = 0;
  private readonly MENU_W = 180; // ancho estimado del menú
  private readonly MENU_H = 156; // alto estimado (3 items) usado para evitar desbordes
  @ViewChild("menuRef") menuRef?: ElementRef<HTMLDivElement>;

  toggle(ev: Event) {
    ev.stopPropagation();
    if (!this.open) {
      // Notificar a otros menús que deben cerrarse
      document.dispatchEvent(
        new CustomEvent("action-menu:open", { detail: this })
      );
      const btn = ev.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const GAP = 4;
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      // Colocar por defecto a la derecha del botón, alineado en el eje Y
      let top = rect.top;
      let left = rect.right + GAP;
      // Si no hay espacio a la derecha, abrir a la izquierda del botón
      if (left + this.MENU_W > vpW - 8) {
        left = Math.max(rect.left - this.MENU_W - GAP, 8);
      }
      // Clamp vertical dentro del viewport
      if (top + this.MENU_H > vpH - 8) {
        top = vpH - this.MENU_H - 8;
      }
      if (top < 8) top = 8;

      // Clamp final dentro del viewport
      left = Math.min(Math.max(left, 8), vpW - this.MENU_W - 8);

      this.menuTop = top;
      this.menuLeft = left;
      this.open = true;
      // Ajuste fino con tamaño real si difiere del estimado
      queueMicrotask(() => this.adjustForRealSize(rect));
    } else {
      this.open = false;
    }
  }

  private adjustForRealSize(anchorRect: DOMRect) {
    if (!this.menuRef?.nativeElement) return;
    const el = this.menuRef.nativeElement;
    const realW = el.offsetWidth || this.MENU_W;
    const realH = el.offsetHeight || this.MENU_H;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    // Alinear a la derecha del botón con tamaño real; fallback a izquierda si no entra
    let left = anchorRect.right + 4;
    if (left + realW > vpW - 8) {
      left = Math.max(anchorRect.left - realW - 4, 8);
    }
    let top = anchorRect.top;
    if (top + realH > vpH - 8) {
      top = vpH - realH - 8;
    }
    if (top < 8) top = 8;
    this.menuLeft = left;
    this.menuTop = top;
  }

  onView(ev: Event) {
    ev.stopPropagation();
    this.view.emit();
    this.open = false;
  }
  onEdit(ev: Event) {
    ev.stopPropagation();
    this.edit.emit();
    this.open = false;
  }
  onRemove(ev: Event) {
    ev.stopPropagation();
    this.remove.emit();
    this.open = false;
  }
  onAssign(ev: Event) {
    ev.stopPropagation();
    this.assign.emit();
    this.open = false;
  }
  onAssignTecnicos(ev: Event) {
    ev.stopPropagation();
    this.assignTecnicos.emit();
    this.open = false;
  }
  onRoles(ev: Event) {
    ev.stopPropagation();
    this.roles.emit();
    this.open = false;
  }
  onChangePassword(ev: Event) {
    ev.stopPropagation();
    this.changePassword.emit();
    this.open = false;
  }
  onResetPassword(ev: Event) {
    ev.stopPropagation();
    this.resetPassword.emit();
    this.open = false;
  }

  @HostListener("document:click")
  onDocClick() {
    this.open = false;
  }
  @HostListener("document:action-menu:open", ["$event"]) onOtherMenuOpen(
    event: CustomEvent
  ) {
    // Cerrar este menú si otro se abre
    if (event.detail !== this) {
      this.open = false;
    }
  }
  @HostListener("document:keydown.escape")
  onEsc() {
    this.open = false;
  }
  @HostListener("window:scroll")
  onScroll() {
    if (this.open) this.open = false;
  }
  @HostListener("window:resize")
  onResize() {
    if (this.open) this.open = false;
  }
}
