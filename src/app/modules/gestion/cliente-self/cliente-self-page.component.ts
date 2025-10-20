import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ApiService } from "../../../core/api.service";
import { NotifyService } from "../../../shared/notify/notify.service";
import { MapPickerComponent } from "../../../shared/map-picker/map-picker.component";

interface ClienteSelf {
  id?: number;
  nombre: string;
  telefono: string;
  email?: string;
  direccion: string;
  nit: string;
  latitud: number | null;
  longitud: number | null;
}

@Component({
  standalone: true,
  selector: "app-cliente-self-page",
  imports: [CommonModule, FormsModule, MapPickerComponent],
  templateUrl: "./cliente-self-page.component.html",
  styleUrls: ["./cliente-self-page.component.css"],
})
export class ClienteSelfPageComponent implements OnInit {
  private api = inject(ApiService);
  private notify = inject(NotifyService);

  loading = signal(true);
  hasClient = signal(false);
  draft = signal<ClienteSelf>({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    nit: "",
    latitud: null,
    longitud: null,
  });

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const existing = await this.api.get<any>("/gestion/clientes/self").toPromise();
      if (existing && existing.id) {
        this.hasClient.set(true);
        this.draft.set({
          id: existing.id,
          nombre: existing.nombre || "",
          telefono: existing.telefono || "",
          email: existing.correo || "",
          direccion: existing.direccion || "",
          nit: existing.nit || "",
          latitud: existing.latitud ? Number(existing.latitud) : null,
          longitud: existing.longitud ? Number(existing.longitud) : null,
        });
      } else {
        this.hasClient.set(false);
      }
    } catch (e: any) {
      // Si 404 o null, se asume que no existe
      this.hasClient.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  async save() {
    const d = this.draft();
    // Validaciones mínimas
    if (!d.nombre?.trim() || !d.direccion?.trim() || !d.telefono?.trim() || !d.nit?.trim()) {
      this.notify.error("Completa nombre, dirección, teléfono y NIT");
      return;
    }
    if (d.latitud == null || d.longitud == null) {
      this.notify.error("Selecciona la ubicación en el mapa");
      return;
    }

    const payload: any = {
      nombre: d.nombre.trim(),
      direccion: d.direccion.trim(),
      telefono: d.telefono.trim(),
      correo: d.email?.trim() || undefined,
      nit: d.nit.trim(),
      latitud: d.latitud,
      longitud: d.longitud,
    };

    try {
      if (this.hasClient()) {
        await this.api.patch("/gestion/clientes/self", payload).toPromise();
        this.notify.success("Datos de cliente actualizados");
      } else {
        await this.api.post("/gestion/clientes/self", payload).toPromise();
        this.notify.success("Cliente creado y asociado a tu usuario");
        this.hasClient.set(true);
      }
      await this.load();
    } catch (e: any) {
      const msg = e?.error?.message || "Error guardando tus datos";
      this.notify.error(msg);
    }
  }

  onMapChange(coords: { lat: number; lng: number }) {
    this.draft.update((v) => ({ ...v, latitud: coords.lat, longitud: coords.lng }));
  }
}
