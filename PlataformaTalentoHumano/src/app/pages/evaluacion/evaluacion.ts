import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, getApiBaseUrl } from '../../services/auth.service';

export interface CriterioEvaluacion {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  puntaje: number; // 0 - 100
}

export interface CandidatoEvaluado {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  carrera: string;
  fotoUrl: string;
  iniciales: string;
  temaClase: string;
  asignatura: string;
  fechaHora: string;
  laboratorio: string;
  modalidad: string;
  estado: 'Pendiente' | 'En Evaluación' | 'Calificada';
  promedioActual?: number;
  observaciones?: string;
  criteriosValores?: number[];
}

export interface EvaluadorInfo {
  nombre: string;
  rol: string;
  dependencia: string;
}

@Component({
  selector: 'app-evaluacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './evaluacion.html',
  styleUrls: ['./evaluacion.scss']
})
export class EvaluacionComponent implements OnInit {
  isDarkMode = false;
  guardando = false;
  evaluacionGuardada = false;
  cargando = true;

  // Docente seleccionado para evaluar
  docenteSeleccionado: CandidatoEvaluado | null = null;

  // Filtros de busqueda
  busquedaDocente: string = '';
  filtroEstadoDocente: string = 'Todos';

  // Datos del evaluador
  evaluador: EvaluadorInfo = {
    nombre: 'Comisión Evaluadora ISTS',
    rol: 'Evaluador Institucional',
    dependencia: 'Vicerrectorado Académico ISTS'
  };

  // Lista de docentes para evaluar cargada desde la base de datos de Django
  docentes: CandidatoEvaluado[] = [];

  // Criterios de evaluacion normados (por defecto en 0)
  criterios: CriterioEvaluacion[] = [
    {
      id: 'criterio-1',
      nombre: 'Dominio Técnico',
      descripcion: 'Profundidad de conocimientos, precisión conceptual, rigor técnico y capacidad de resolver cuestionamientos especializados.',
      icono: 'psychology',
      puntaje: 0
    },
    {
      id: 'criterio-2',
      nombre: 'Metodología y Didáctica',
      descripcion: 'Estructuración pedagógica de la sesión con inicio, desarrollo práctico y síntesis, ritmo de clase y efectividad en la enseñanza.',
      icono: 'menu_book',
      puntaje: 0
    },
    {
      id: 'criterio-3',
      nombre: 'Comunicación y Claridad',
      descripcion: 'Claridad expositiva, modulación de la voz, lenguaje técnico accesible, dinamismo y conexión con el auditorio.',
      icono: 'record_voice_over',
      puntaje: 0
    },
    {
      id: 'criterio-4',
      nombre: 'Innovación y Recursos',
      descripcion: 'Uso efectivo de herramientas tecnológicas, entornos de ejecución en vivo, diseño de diapositivas y recursos didácticos digitales.',
      icono: 'lightbulb',
      puntaje: 0
    },
    {
      id: 'criterio-5',
      nombre: 'Manejo del Grupo',
      descripcion: 'Generación de participación activa, control de la atención del grupo, clima de respeto y gestión del tiempo de clase.',
      icono: 'groups',
      puntaje: 0
    }
  ];

  // Observaciones del evaluador
  observaciones = '';

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    const usuario = this.authService.usuarioActual();
    if (usuario) {
      this.evaluador = {
        nombre: usuario.nombre,
        rol: usuario.nombreRol,
        dependencia: usuario.departamento || 'Comisión de Selección Docente ISTS'
      };
    }

    this.cargarDocentes();
  }

  // Carga las postulaciones reales desde Django
  cargarDocentes(): void {
    this.cargando = true;
    const usuario = this.authService.usuarioActual();
    const rolParam = usuario?.rol ? `&rol_evaluador=${usuario.rol}` : '';
    const url = `${getApiBaseUrl()}/api/postulaciones/?_t=${Date.now()}${rolParam}`;

    this.http.get<any[]>(url).subscribe({
      next: (lista) => {
        if (Array.isArray(lista)) {
          this.docentes = lista.map(p => this.mapearDocente(p));
        } else {
          this.docentes = [];
        }
        this.cargando = false;

        // Comprobar si viene ID por query params
        this.route.queryParams.subscribe(params => {
          if (params['id']) {
            const docenteEncontrado = this.docentes.find(d => d.id === params['id']);
            if (docenteEncontrado) {
              this.seleccionarDocente(docenteEncontrado);
            }
          }
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al cargar postulaciones para evaluación:', err);
        this.docentes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapearDocente(p: any): CandidatoEvaluado {
    const nombres = p.usuario_nombres || p.usuario_nombre?.split(' ')[0] || 'Docente';
    const apellidos = p.usuario_apellidos || (p.usuario_nombre ? p.usuario_nombre.split(' ').slice(1).join(' ') : '') || '';
    const iniciales = ((nombres[0] || '') + (apellidos[0] || '')).toUpperCase() || 'DO';

    const ev = p.evaluacion_clase;
    const tieneEval = !!ev && (ev.promedio_clase !== undefined && ev.promedio_clase !== null);
    const criteriosValores = tieneEval ? [
      Number(ev.criterio_dominio_tecnico) || 0,
      Number(ev.criterio_metodologia) || 0,
      Number(ev.criterio_comunicacion) || 0,
      Number(ev.criterio_innovacion) || 0,
      Number(ev.criterio_manejo_grupo) || 0
    ] : [0, 0, 0, 0, 0];

    return {
      id: String(p.id),
      nombres: nombres,
      apellidos: apellidos,
      cedula: p.usuario_cedula || '',
      correo: p.usuario_correo || '',
      carrera: p.convocatoria_carrera || 'Tecnología Superior',
      fotoUrl: '',
      iniciales: iniciales,
      temaClase: ev?.tema_asignado || `Cátedra Magistral: ${p.convocatoria_titulo || 'Especialidad'}`,
      asignatura: ev?.asignatura || p.convocatoria_titulo || 'Asignatura Asignada',
      fechaHora: '28 de Octubre de 2026 • 10:00 AM',
      laboratorio: ev?.laboratorio || 'Campus Matriz Loja',
      modalidad: p.convocatoria_modalidad || 'Presencial',
      estado: tieneEval ? 'Calificada' : (p.etapa_actual >= 5 ? 'En Evaluación' : 'Pendiente'),
      promedioActual: tieneEval ? Number(ev.promedio_clase) : undefined,
      observaciones: ev?.observaciones || '',
      criteriosValores: criteriosValores
    };
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

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

  // Seleccionar docente
  seleccionarDocente(docente: CandidatoEvaluado): void {
    this.docenteSeleccionado = docente;
    this.observaciones = docente.observaciones || '';

    // Cargar notas guardadas en BD o dejar en 0
    if (docente.criteriosValores && docente.criteriosValores.length === 5) {
      this.criterios.forEach((c, idx) => {
        c.puntaje = docente.criteriosValores![idx] || 0;
      });
    } else {
      this.criterios.forEach(c => c.puntaje = 0);
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Regresar a la lista
  volverALista(): void {
    this.docenteSeleccionado = null;
    this.evaluacionGuardada = false;
  }

  // Metricas dinamicas
  get docentesFiltrados(): CandidatoEvaluado[] {
    return this.docentes.filter(d => {
      const termino = this.busquedaDocente.trim().toLowerCase();
      const coincideTexto = !termino ||
        d.nombres.toLowerCase().includes(termino) ||
        d.apellidos.toLowerCase().includes(termino) ||
        d.carrera.toLowerCase().includes(termino) ||
        d.cedula.includes(termino);

      const coincideEstado = this.filtroEstadoDocente === 'Todos' || d.estado === this.filtroEstadoDocente;

      return coincideTexto && coincideEstado;
    });
  }

  get totalDocentes(): number {
    return this.docentes.length;
  }

  get totalCalificados(): number {
    return this.docentes.filter(d => d.estado === 'Calificada').length;
  }

  get totalPendientes(): number {
    return this.docentes.filter(d => d.estado === 'Pendiente').length;
  }

  get totalEnEvaluacion(): number {
    return this.docentes.filter(d => d.estado === 'En Evaluación').length;
  }

  get promedioGeneral(): number {
    const calificados = this.docentes.filter(d => d.promedioActual !== undefined);
    if (calificados.length === 0) return 0;
    const suma = calificados.reduce((acc, curr) => acc + (curr.promedioActual || 0), 0);
    return Math.round((suma / calificados.length) * 10) / 10;
  }

  // Conteo rapido por estado para los KPI
  contarPorEstadoDocente(estado: string): number {
    return this.docentes.filter(d => d.estado === estado).length;
  }

  // Validacion de rango en input numerico
  validarRango(criterio: CriterioEvaluacion): void {
    if (criterio.puntaje > 100) criterio.puntaje = 100;
    if (criterio.puntaje < 0 || isNaN(criterio.puntaje)) criterio.puntaje = 0;
  }

  // Presets rapidos de calificacion
  asignarPreset(criterio: CriterioEvaluacion, valor: number): void {
    criterio.puntaje = valor;
  }

  aplicarPreset(criterio: CriterioEvaluacion, valor: number): void {
    criterio.puntaje = valor;
  }

  // Promedio de los 5 criterios ponderados
  get promedioActual(): number {
    const suma = this.criterios.reduce((acc, curr) => acc + curr.puntaje, 0);
    return Math.round((suma / this.criterios.length) * 10) / 10;
  }

  get promedioCalculado(): number {
    return this.promedioActual;
  }

  // Aporte al 50%
  get aportePonderado(): number {
    return Math.round((this.promedioCalculado * 0.5) * 10) / 10;
  }

  // Clasificacion cualitativa para el modal y sidebar
  get clasificacion(): { texto: string; clase: string; icono: string; descripcion: string } {
    const p = this.promedioCalculado;
    if (p >= 90) {
      return {
        texto: 'Sobresaliente',
        clase: 'badge-sobresaliente',
        icono: 'verified',
        descripcion: 'Cumple excepcionalmente los estándares pedagógicos institucionales.'
      };
    } else if (p >= 80) {
      return {
        texto: 'Muy Bueno',
        clase: 'badge-muy-bueno',
        icono: 'thumb_up',
        descripcion: 'Demuestra solidez metodológica y suficiencia técnica institucional.'
      };
    } else if (p >= 70) {
      return {
        texto: 'Aceptable',
        clase: 'badge-bueno',
        icono: 'check_circle',
        descripcion: 'Alcanza el puntaje mínimo reglamentario para elegibilidad docente.'
      };
    } else {
      return {
        texto: 'Insuficiente',
        clase: 'badge-insuficiente',
        icono: 'warning',
        descripcion: 'No alcanza el estándar mínimo de oposición requerido.'
      };
    }
  }

  get clasificacionCualitativa(): { etiqueta: string; clase: string; descripcion: string } {
    const c = this.clasificacion;
    return {
      etiqueta: c.texto,
      clase: c.clase,
      descripcion: c.descripcion
    };
  }

  // Cerrar modal
  cerrarModal(volver: boolean): void {
    this.evaluacionGuardada = false;
    if (volver) {
      this.volverALista();
    }
  }

  // Guardar calificacion y borrador
  guardarCalificacion(): void {
    this.guardarEvaluacion();
  }

  guardarBorrador(): void {
    if (!this.docenteSeleccionado) return;
    this.docenteSeleccionado.observaciones = this.observaciones;
    this.docenteSeleccionado.criteriosValores = this.criterios.map(c => c.puntaje);
    alert('Borrador guardado localmente.');
  }

  // Guardar evaluacion en base de datos
  guardarEvaluacion(): void {
    if (!this.docenteSeleccionado) return;

    this.guardando = true;
    const promedioFinal = this.promedioActual;
    const usuario = this.authService.usuarioActual();
    const evaluadorId = usuario?.id;
    const rolEvaluador = usuario?.rol || 'VICERRECTORADO';

    // Persistir puntaje y criterios en Django MySQL usando el endpoint de evaluacion
    this.http.post<any>(`${getApiBaseUrl()}/api/postulaciones/${this.docenteSeleccionado.id}/evaluar/`, {
      criterios: this.criterios.map(c => c.puntaje),
      promedio: promedioFinal,
      observaciones: this.observaciones,
      evaluador_id: evaluadorId,
      rol_evaluador: rolEvaluador
    }).subscribe({
      next: (res) => {
        this.guardando = false;
        this.evaluacionGuardada = true;

        if (this.docenteSeleccionado) {
          this.docenteSeleccionado.promedioActual = promedioFinal;
          this.docenteSeleccionado.estado = 'Calificada';
          this.docenteSeleccionado.observaciones = this.observaciones;
          this.docenteSeleccionado.criteriosValores = this.criterios.map(c => c.puntaje);
        }

        this.cdr.detectChanges();
        // Recargar lista completa de la BD para tener los datos sincronizados
        this.cargarDocentes();

        setTimeout(() => {
          this.evaluacionGuardada = false;
          this.volverALista();
        }, 1800);
      },
      error: (err) => {
        console.warn('Error al persistir calificación en Django:', err);
        this.guardando = false;
        this.evaluacionGuardada = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.evaluacionGuardada = false;
          this.volverALista();
        }, 1800);
      }
    });
  }
}
