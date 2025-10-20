import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import * as L from "leaflet";

@Component({
  standalone: true,
  selector: "app-map-picker",
  imports: [CommonModule],
  template: `
    <div class="map-toolbar" *ngIf="!viewOnly">
      <small>Haga clic en el mapa para seleccionar la ubicación.</small>
    </div>
    <div #mapContainer class="map-container" role="region" aria-label="selector de ubicación"></div>
  `,
  styles: [`
    :host { display: block; }
    .map-container { width: 100%; height: 320px; min-height: 280px; border-radius: 8px; border: 1px solid #ddd; overflow: hidden; }
    .map-toolbar { margin-bottom: 6px; color: #555; }
  `]
})
export class MapPickerComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() lat?: number | null;
  @Input() lng?: number | null;
  @Input() viewOnly = false;
  @Output() changed = new EventEmitter<{ lat: number; lng: number }>();

  private map?: L.Map;
  private marker?: L.Marker;
  private resizeObs?: ResizeObserver;

  ngOnInit(): void {
    this.initWhenVisible();
  }

  private initWhenVisible(attempt = 0) {
    const el = this.mapContainer?.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && !!el.offsetParent;
    if (!visible && attempt < 10) {
      setTimeout(() => this.initWhenVisible(attempt + 1), 100);
      return;
    }

    const startLat = this.lat ?? 14.6349;  // Guatemala City aprox
    const startLng = this.lng ?? -90.5069;
    const zoom = this.lat != null && this.lng != null ? 15 : 12;

    this.map = L.map(this.mapContainer.nativeElement);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.setView([startLat, startLng], zoom);

    if (this.lat != null && this.lng != null) {
      this.marker = L.marker([startLat, startLng]).addTo(this.map);
    }

    if (!this.viewOnly) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (!this.marker) {
          this.marker = L.marker([lat, lng]).addTo(this.map!);
        } else {
          this.marker.setLatLng([lat, lng]);
        }
        this.changed.emit({ lat, lng });
      });
    }

    // Invalidar tamaño cuando el contenedor cambie (útil en modales)
    this.resizeObs = new ResizeObserver(() => {
      this.invalidate();
    });
    this.resizeObs.observe(this.mapContainer.nativeElement);

    // Invalidar después de montar (por si el modal anima su apertura)
    setTimeout(() => this.invalidate(), 0);
    setTimeout(() => this.invalidate(), 150);
    setTimeout(() => this.invalidate(), 350);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
    if (this.resizeObs) {
      this.resizeObs.disconnect();
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.invalidate();
  }

  private invalidate() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }
}
