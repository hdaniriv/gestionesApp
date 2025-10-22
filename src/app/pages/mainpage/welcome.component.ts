import { Component, OnDestroy, OnInit, ViewChild, ElementRef, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiService } from "../../core/api.service";
import { AuthService } from "../../core/auth.service";
import { firstValueFrom } from "rxjs";

@Component({
  standalone: true,
  selector: "app-welcome",
  templateUrl: "./welcome.component.html",
  styleUrls: ["./welcome.component.css"],
  imports: [CommonModule],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  // Roles
  isAdmin = computed(() => this.auth.hasRole("Administrador"));
  isSupervisor = computed(() => this.auth.hasRole("Supervisor"));
  isTecnico = computed(() => this.auth.hasRole("Tecnico"));
  isCliente = computed(() => this.auth.hasRole("Cliente"));

  // Datos dashboard
  loading = signal(false);
  gestiones = signal<any[]>([]);
  resumen = signal<{ total: number } | null>(null);
  clientes = signal<Array<{ id: number; nombre: string; nit?: string }>>([]);
  // Contadores fijos por sección
  countEstados = signal(0);
  countTecnicos = signal(0);
  countClientes = signal(0);
  countEstadoTecnico = signal(0);

  // Canvas refs
  @ViewChild('chartEstados') chartEstadosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTecnicos') chartTecnicosRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartClientes') chartClientesRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEstadoTecnico') chartEstadoTecnicoRef!: ElementRef<HTMLCanvasElement>;

  private charts: any[] = [];

  async ngOnInit() {
    if (this.isAdmin() || this.isSupervisor()) {
      await this.loadClientesIfAllowed();
      await this.loadMes();
      // Defer chart rendering until view initializes (small timeout)
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  private setDefaultMonth(): { desde: string; hasta: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return { desde: toDate(start), hasta: toDate(now) };
  }

  private computeEstadoDisplay(g: any): string {
    if (g?.fechaFin) return 'Finalizado';
    if (g?.fechaInicio) return 'En Proceso';
    if (g?.idTecnico) return 'Asignado';
    return 'Nuevo';
  }

  private tecnicoLabel(g: any): string {
    return g?.tecnicoNombre || (g?.idTecnico ? `ID ${g.idTecnico}` : 'Sin asignar');
  }
  private clienteNombreById(id?: number): string {
    if (!id) return '—';
    const c = this.clientes().find(x => x.id === id);
    return c?.nombre || `ID ${id}`;
  }

  private async loadClientesIfAllowed() {
    try {
      // Admin/Supervisor pueden listar clientes
      if (this.isAdmin() || this.isSupervisor()) {
        const list = await firstValueFrom(this.api.get<any[]>("/gestion/clientes"));
        const lite = (list || []).map(c => ({ id: c.id, nombre: c.nombre, nit: c.nit }));
        this.clientes.set(lite);
      } else {
        this.clientes.set([]);
      }
    } catch {
      this.clientes.set([]);
    }
  }

  private async loadMes() {
    this.loading.set(true);
    try {
      const rng = this.setDefaultMonth();
      const list = await firstValueFrom(this.api.get<any[]>(`/gestion/gestiones/search`, rng));
      this.gestiones.set(list || []);
      this.resumen.set({ total: this.gestiones().length });
    } finally {
      this.loading.set(false);
    }
  }

  private destroyCharts() {
    this.charts.forEach((c) => c?.destroy?.());
    this.charts = [];
  }

  private ensureChart(ctx: CanvasRenderingContext2D | null, cfg: any) {
    if (!ctx) return null;
  // Chart es global (CDN). Evitar type errors con any
  const baseOptions = { responsive: true, maintainAspectRatio: true, aspectRatio: 1.8 } as any;
  const ChartCtor: any = (window as any).Chart;
  const c = new ChartCtor(ctx, { ...cfg, options: { ...(cfg.options||{}), ...baseOptions } });
    this.charts.push(c);
    return c;
  }

  private renderCharts() {
    this.destroyCharts();
    const data = this.gestiones();
    if (!data?.length) return;
  const total = data.length;
  this.countEstados.set(total);
  this.countTecnicos.set(total);
  this.countClientes.set(total);
  this.countEstadoTecnico.set(total);

    // 1) Por estados
    const estados = ['Nuevo','Asignado','En Proceso','Finalizado','Pendiente'];
    const mapEstados = new Map<string, number>(); estados.forEach(e=>mapEstados.set(e,0));
    data.forEach(g => {
      const e = this.computeEstadoDisplay(g);
      mapEstados.set(e, (mapEstados.get(e)||0)+1);
    });
    const estadosLabels = estados;
    const estadosValues = estadosLabels.map(l => mapEstados.get(l) || 0);
    this.ensureChart(this.chartEstadosRef?.nativeElement?.getContext('2d'), {
      type: 'pie',
      data: { labels: estadosLabels, datasets: [{ data: estadosValues, backgroundColor: ['#90caf9','#ffcc80','#81c784','#bdbdbd','#ef9a9a'] }] },
      options: { plugins: { legend: { position: 'bottom' } } }
    });

    // 2) Por técnico
    const mapTec: Record<string, number> = {};
    data.forEach(g => { const k = this.tecnicoLabel(g); mapTec[k] = (mapTec[k]||0)+1; });
    const tecLabels = Object.keys(mapTec);
    const tecValues = tecLabels.map(k => mapTec[k]);
    this.ensureChart(this.chartTecnicosRef?.nativeElement?.getContext('2d'), {
      type: 'bar',
      data: { labels: tecLabels, datasets: [{ label: 'Gestiones', data: tecValues, backgroundColor: '#90caf9' }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } } }
    });

    // 3) Por cliente
  const mapCli: Record<string, number> = {};
  data.forEach(g => { const k = this.clienteNombreById(g?.idCliente); mapCli[k] = (mapCli[k]||0)+1; });
    const cliLabels = Object.keys(mapCli);
    const cliValues = cliLabels.map(k => mapCli[k]);
    this.ensureChart(this.chartClientesRef?.nativeElement?.getContext('2d'), {
      type: 'bar',
      data: { labels: cliLabels, datasets: [{ label: 'Gestiones', data: cliValues, backgroundColor: '#a5d6a7' }] },
      options: { plugins: { legend: { display: false } } }
    });

    // 4) Estado x Técnico (stacked)
    const tecSet = new Set<string>(); data.forEach(g => tecSet.add(this.tecnicoLabel(g)));
    const tecArr = Array.from(tecSet);
    const estadoColors: Record<string,string> = { 'Nuevo':'#90caf9', 'Asignado':'#ffcc80', 'En Proceso':'#81c784', 'Finalizado':'#bdbdbd', 'Pendiente':'#ef9a9a' };
    const datasets = estados.map(e => ({ label: e, data: tecArr.map(t => 0), backgroundColor: estadoColors[e] }));
    data.forEach(g => {
      const tIdx = tecArr.indexOf(this.tecnicoLabel(g));
      const e = this.computeEstadoDisplay(g); const d = datasets.find(x=>x.label===e); if (tIdx>=0 && d) d.data[tIdx] = (d.data[tIdx] as number)+1;
    });
    this.ensureChart(this.chartEstadoTecnicoRef?.nativeElement?.getContext('2d'), {
      type: 'bar',
      data: { labels: tecArr, datasets },
      options: { scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'bottom' } } }
    });
  }
}
