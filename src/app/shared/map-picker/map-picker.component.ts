import { CommonModule } from "@angular/common";
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from "@angular/core";

@Component({
  standalone: true,
  selector: "app-map-picker",
  imports: [CommonModule],
  template: `
    <div class="map-toolbar">
      <button class="btn outline" type="button" (click)="useMyLocation()">
        <span class="material-icons" aria-hidden="true">my_location</span>
        Usar mi ubicación
      </button>
      <small class="hint">Toque el mapa para seleccionar la ubicación</small>
    </div>
    <div #mapHost class="map-frame" [style.height]="height"></div>
  `,
  styles: [
    `
      .map-toolbar { display:flex; gap:8px; margin-bottom:8px; align-items:center; }
      .map-toolbar .hint { color:#6b7280; }
      .map-frame { width:100%; border-radius:8px; overflow:hidden; background:#f3f4f6; border:1px solid #e5e7eb; }
      .material-icons { font-size: 20px; vertical-align: middle; }
    `,
  ],
})
export class MapPickerComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() lat?: number;
  @Input() lng?: number;
  @Input() height: string = '280px';
  @Output() changed = new EventEmitter<{ lat: number; lng: number }>();
  @ViewChild('mapHost', { static: true }) mapHost!: ElementRef<HTMLDivElement>;

  private map: any;
  private marker: any;
  private resizeObs?: ResizeObserver;

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.map && (changes['lat'] || changes['lng'])) {
      this.setViewAndMarker();
    }
  }

  private initMap() {
    const el = this.mapHost?.nativeElement;
    if (!el) return;
    const startLat = this.lat ?? 14.6349;
    const startLng = this.lng ?? -90.5069;
    const zoom = this.lat != null && this.lng != null ? 15 : 12;
    // L es global, cargado desde CDN
    // @ts-ignore
    this.map = L.map(el);
    // @ts-ignore
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.setView([startLat, startLng], zoom);
    this.setViewAndMarker();
    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);
      this.changed.emit({ lat, lng });
    });
    this.resizeObs = new ResizeObserver(() => this.invalidateSize());
    this.resizeObs.observe(el);
    setTimeout(() => this.invalidateSize(), 0);
    setTimeout(() => this.invalidateSize(), 150);
  }

  private setViewAndMarker() {
    const lat = this.lat ?? 14.6349;
    const lng = this.lng ?? -90.5069;
    this.setMarker(lat, lng);
    if (this.map) this.map.setView([lat, lng], this.lat != null && this.lng != null ? 15 : 12);
  }

  private setMarker(lat: number, lng: number) {
    if (!this.map) return;
    if (!this.marker) {
      // @ts-ignore
      this.marker = L.marker([lat, lng]).addTo(this.map);
    } else {
      this.marker.setLatLng([lat, lng]);
    }
  }

  private invalidateSize() {
    if (this.map) this.map.invalidateSize();
  }

  useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      this.setMarker(lat, lng);
      if (this.map) this.map.setView([lat, lng], 16);
      this.changed.emit({ lat, lng });
    });
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
    if (this.resizeObs) this.resizeObs.disconnect();
  }
}
