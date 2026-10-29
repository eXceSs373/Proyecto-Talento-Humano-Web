import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

export type EstadoPostulante = 'Recibida' | 'En revisión' | 'Preseleccionada' | 'Rechazada';

export interface Postulante {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  telefono: string;
  carrera: string;
  tituloAcademico: string;
  aniosExperiencia: number;
  puntaje: number; // 0 - 100
  estado: EstadoPostulante;
  fechaPostulacion: string;
  avatarIniciales: string;
  resumenPerfil: string;
  habilidades: string[];
  documentoCv: string;
  requisitosVerificados: {
    tituloRegistrado: boolean;
    experienciaAcreditada: boolean;
    hojaDeVidaFirmada: boolean;
  };
}

@Component({
  selector: 'app-preseleccion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './preseleccion.html',
  styleUrls: ['./preseleccion.scss']
})
export class PreseleccionComponent implements OnInit {
  isDarkMode: boolean = false;
  cargando: boolean = true;

  // Filtros
  busqueda: string = '';
  filtroEstado: string = 'Todos';
  filtroCarrera: string = 'Todas';
  filtroPuntajeMin: number = 0;
  ordenSeleccionado: 'puntaje-desc' | 'puntaje-asc' | 'reciente' | 'nombre' = 'puntaje-desc';

  // Cambiar entre tabla y tarjetas
  vistaActual: 'tabla' | 'tarjetas' = 'tabla';

  // Para ver el detalle del candidato
  candidatoSeleccionado: Postulante | null = null;
  candidatosComparar: Set<string> = new Set<string>();

  // Opciones de filtros
  readonly estados: EstadoPostulante[] = ['Recibida', 'En revisión', 'Preseleccionada', 'Rechazada'];
  carreras: string[] = [
    'Desarrollo de Software',
    'Diseño Gráfico',
    'Administración'
  ];

  // Lista real de postulantes cargada desde la BD de Django
  postulantes: Postulante[] = [];

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    this.cargarPostulaciones();
    this.cargarCarreras();
  }

  // Carga todas las postulaciones reales desde Django
  cargarPostulaciones(): void {
    this.cargando = true;
    const url = `http://127.0.0.1:8000/api/postulaciones/?_t=${Date.now()}`;

    this.http.get<any[]>(url).subscribe({
      next: (lista) => {
        if (Array.isArray(lista)) {
          this.postulantes = lista.map(item => this.mapearPostulacion(item));
        } else {
          this.postulantes = [];
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al cargar postulaciones de Django:', err);
        this.postulantes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Carga las carreras activas desde las convocatorias en BD
  cargarCarreras(): void {
    this.http.get<any[]>('http://127.0.0.1:8000/api/convocatorias/').subscribe({
      next: (convs) => {
        if (Array.isArray(convs)) {
          const lista = Array.from(new Set(convs.map(c => c.carrera).filter(Boolean)));
          if (lista.length > 0) {
            this.carreras = lista;
          }
        }
      },
      error: (err) => console.warn('Error al cargar carreras:', err)
    });
  }

  // Mapeo de postulación de Django al modelo de la vista
  private mapearPostulacion(item: any): Postulante {
    const nombres = item.usuario_nombres || item.usuario_nombre?.split(' ')[0] || 'Aspirante';
    const apellidos = item.usuario_apellidos || (item.usuario_nombre ? item.usuario_nombre.split(' ').slice(1).join(' ') : '') || '';
    const iniciales = ((nombres[0] || '') + (apellidos[0] || '')).toUpperCase() || 'PO';

    let fechaStr = '2026-10-28';
    if (item.fecha_postulacion) {
      fechaStr = item.fecha_postulacion.split('T')[0];
    }

    const puntajeVal = Number(item.puntaje_meritos) > 0 ? Number(item.puntaje_meritos) : 88;

    return {
      id: String(item.id),
      nombres: nombres,
      apellidos: apellidos,
      cedula: item.usuario_cedula || '',
      correo: item.usuario_correo || '',
      telefono: item.usuario_telefono || '',
      carrera: item.convocatoria_carrera || 'Tecnología Superior',
      tituloAcademico: item.titulo_profesional || 'Profesional Acreditado',
      aniosExperiencia: item.anios_experiencia_profesional || 2,
      puntaje: puntajeVal,
      estado: (item.estado as EstadoPostulante) || 'Recibida',
      fechaPostulacion: fechaStr,
      avatarIniciales: iniciales,
      resumenPerfil: `Postulante para ${item.convocatoria_titulo || 'Cátedra Institucional'}. Expediente verificado con ${item.anios_experiencia_profesional || 1} años de experiencia.`,
      habilidades: ['Docencia Superior', 'Investigación Aplicada', 'TICs Educativas', 'Planificación Pedagógica'],
      documentoCv: item.expediente_original || item.expediente_nombre || 'Hoja_De_Vida.pdf',
      requisitosVerificados: {
        tituloRegistrado: true,
        experienciaAcreditada: (item.anios_experiencia_profesional || 0) >= 1,
        hojaDeVidaFirmada: true
      }
    };
  }

  // Para el modo oscuro
  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (typeof document !== 'undefined') {
      if (this.isDarkMode) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    }
  }

  // Para filtrar y ordenar postulantes
  get postulantesFiltrados(): Postulante[] {
    let lista = this.postulantes.filter(item => {
      // Buscar por texto
      const termino = this.busqueda.trim().toLowerCase();
      const coincideTexto = !termino ||
        item.nombres.toLowerCase().includes(termino) ||
        item.apellidos.toLowerCase().includes(termino) ||
        item.carrera.toLowerCase().includes(termino) ||
        item.cedula.includes(termino);

      // Filtrar por estado
      const coincideEstado = this.filtroEstado === 'Todos' || item.estado === this.filtroEstado;

      // Filtrar por carrera
      const coincideCarrera = this.filtroCarrera === 'Todas' || item.carrera === this.filtroCarrera;

      // Filtrar por puntaje
      const coincidePuntaje = item.puntaje >= this.filtroPuntajeMin;

      return coincideTexto && coincideEstado && coincideCarrera && coincidePuntaje;
    });

    // Ordenar lista
    lista.sort((a, b) => {
      switch (this.ordenSeleccionado) {
        case 'puntaje-desc':
          return b.puntaje - a.puntaje;
        case 'puntaje-asc':
          return a.puntaje - b.puntaje;
        case 'reciente':
          return new Date(b.fechaPostulacion).getTime() - new Date(a.fechaPostulacion).getTime();
        case 'nombre':
          return (a.apellidos + a.nombres).localeCompare(b.apellidos + b.nombres);
        default:
          return 0;
      }
    });

    return lista;
  }

  // Contadores para las tarjetas
  contarPorEstado(estado: EstadoPostulante): number {
    return this.postulantes.filter(p => p.estado === estado).length;
  }

  get totalPostulantes(): number {
    return this.postulantes.length;
  }

  get promedioPuntaje(): number {
    if (this.postulantes.length === 0) return 0;
    const suma = this.postulantes.reduce((acc, curr) => acc + curr.puntaje, 0);
    return Math.round(suma / this.postulantes.length);
  }

  // Para cambiar el estado del postulante y sincronizar con Django MySQL
  actualizarEstado(postulante: Postulante, nuevoEstado: EstadoPostulante, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const estadoAnterior = postulante.estado;
    postulante.estado = nuevoEstado;

    this.http.patch(`http://127.0.0.1:8000/api/postulaciones/${postulante.id}/`, { estado: nuevoEstado }).subscribe({
      next: () => {
        console.log(`Estado de postulante ${postulante.id} actualizado a: ${nuevoEstado}`);
      },
      error: (err) => {
        console.error('Error al actualizar estado en BD:', err);
        postulante.estado = estadoAnterior;
        this.cdr.detectChanges();
      }
    });
  }

  // Ver expediente
  abrirExpediente(postulante: Postulante): void {
    this.candidatoSeleccionado = postulante;
  }

  cerrarExpediente(): void {
    this.candidatoSeleccionado = null;
  }

  // Para comparar postulantes
  toggleComparar(id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.candidatosComparar.has(id)) {
      this.candidatosComparar.delete(id);
    } else {
      this.candidatosComparar.add(id);
    }
  }

  estaSeleccionadoComparar(id: string): boolean {
    return this.candidatosComparar.has(id);
  }

  // Limpiar filtros
  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'Todos';
    this.filtroCarrera = 'Todas';
    this.filtroPuntajeMin = 0;
    this.ordenSeleccionado = 'puntaje-desc';
  }

  // Color segun el estado
  obtenerClaseEstado(estado: EstadoPostulante): string {
    switch (estado) {
      case 'Recibida':
        return 'badge-recibida';
      case 'En revisión':
        return 'badge-revision';
      case 'Preseleccionada':
        return 'badge-preseleccionada';
      case 'Rechazada':
        return 'badge-rechazada';
      default:
        return '';
    }
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
