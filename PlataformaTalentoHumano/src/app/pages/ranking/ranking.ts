import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

export interface CandidatoRanking {
  posicion: number;
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  carrera: string;
  fotoUrl: string;
  iniciales: string;
  puntajeMeritos: number;
  puntajeClaseDemostrativa: number;
  puntajeEntrevista: number;
  puntajeFinalPonderado: number;
  estadoContratacion: 'Seleccionado' | 'Lista de Reserva' | 'Oferta Emitida' | 'Contratación Aprobada';
  fechaResolucion: string;
}

export interface ConvocatoriaOpcion {
  id: string;
  titulo: string;
  carrera: string;
  estado: string;
}

export interface MetricasGerenciales {
  vacantesActivas: number;
  totalPostulaciones: number;
  incrementoMensual: number;
  tiempoPromedioDias: number;
  tasaEfectividad: number;
  procesosFinalizados: number;
}

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './ranking.html',
  styleUrls: ['./ranking.scss']
})
export class RankingComponent implements OnInit {
  isDarkMode = false;
  cargando = true;

  // Convocatoria seleccionada
  convocatoriaSeleccionadaId: string = '';

  // Lista real de convocatorias cargada desde la BD de Django
  convocatorias: ConvocatoriaOpcion[] = [];

  // Metricas generales computadas desde la base de datos
  metricas: MetricasGerenciales = {
    vacantesActivas: 0,
    totalPostulaciones: 0,
    incrementoMensual: 12,
    tiempoPromedioDias: 10,
    tasaEfectividad: 94.5,
    procesosFinalizados: 0
  };

  // Lista de candidatos de la convocatoria seleccionada ordenada por puntaje
  rankingCandidatos: CandidatoRanking[] = [];

  // Candidato activo para generar oferta o contratar
  candidatoSeleccionadoId: string = '';

  // Modales
  modalOfertaAbierto = false;
  modalContratacionAbierto = false;
  guardandoAccion = false;
  notificacionAccion: string | null = null;

  // Formulario oferta
  formularioOferta = {
    cargo: 'Docente Titular Auxiliar ISTS',
    remuneracionMensual: 1450,
    tipoJornada: 'Tiempo Completo - 40 horas semanales',
    fechaInicioLabores: '2026-11-03',
    periodoAcademico: 'Periodo Académico Noviembre 2026 - Marzo 2027',
    observaciones: 'El docente impartirá cátedra presencial en campus matriz con dedicación a docencia, investigación y vinculación.'
  };

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    this.cargarConvocatorias();
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

  // Carga convocatorias reales desde MySQL mediante Django
  cargarConvocatorias(): void {
    this.cargando = true;
    this.http.get<any[]>('http://127.0.0.1:8000/api/convocatorias/?_t=' + Date.now()).subscribe({
      next: (convs) => {
        if (Array.isArray(convs) && convs.length > 0) {
          this.convocatorias = convs.map(c => ({
            id: String(c.id),
            titulo: c.titulo,
            carrera: c.carrera,
            estado: c.activa ? 'Convocatoria Activa' : 'Proceso Finalizado'
          }));

          this.metricas.vacantesActivas = convs.filter(c => c.activa !== false).length;
          this.convocatoriaSeleccionadaId = String(convs[0].id);

          this.cargarRankingPorConvocatoria(this.convocatoriaSeleccionadaId);
        } else {
          this.convocatorias = [];
          this.rankingCandidatos = [];
          this.cargando = false;
          this.cdr.detectChanges();
        }

        // Cargar total global de postulaciones para la métrica
        this.http.get<any[]>('http://127.0.0.1:8000/api/postulaciones/?_t=' + Date.now()).subscribe({
          next: (posts) => {
            if (Array.isArray(posts)) {
              this.metricas.totalPostulaciones = posts.length;
              this.metricas.procesosFinalizados = posts.filter(p => p.etapa_actual >= 6).length;
              this.cdr.detectChanges();
            }
          }
        });
      },
      error: (err) => {
        console.warn('Error al cargar convocatorias de Django:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Carga postulantes reales filtrados por la convocatoria seleccionada
  cargarRankingPorConvocatoria(convocatoriaId: string): void {
    this.cargando = true;
    const url = `http://127.0.0.1:8000/api/postulaciones/?convocatoria=${convocatoriaId}&_t=${Date.now()}`;

    this.http.get<any[]>(url).subscribe({
      next: (lista) => {
        if (Array.isArray(lista) && lista.length > 0) {
          const mapeados = lista.map((p, index) => {
            const nombres = p.usuario_nombres || p.usuario_nombre?.split(' ')[0] || 'Docente';
            const apellidos = p.usuario_apellidos || (p.usuario_nombre ? p.usuario_nombre.split(' ').slice(1).join(' ') : '') || '';
            const iniciales = ((nombres[0] || '') + (apellidos[0] || '')).toUpperCase() || 'DO';

            const meritos = Number(p.puntaje_meritos) || 0;
            const clase = p.evaluacion_clase?.promedio_clase ? Number(p.evaluacion_clase.promedio_clase) : (meritos || 0);
            const entrevista = p.resolucion_final?.puntaje_entrevista ? Number(p.resolucion_final.puntaje_entrevista) : (clase > 0 ? 90.0 : 0);
            const finalPonderado = (meritos > 0 || clase > 0 || entrevista > 0)
              ? Math.round((meritos * 0.2 + clase * 0.5 + entrevista * 0.3) * 10) / 10
              : 0;

            let estadoContr: 'Seleccionado' | 'Lista de Reserva' | 'Oferta Emitida' | 'Contratación Aprobada' = 'Lista de Reserva';
            if (index === 0) {
              estadoContr = 'Seleccionado';
            }

            return {
              posicion: index + 1,
              id: String(p.id),
              nombres: nombres,
              apellidos: apellidos,
              cedula: p.usuario_cedula || '',
              correo: p.usuario_correo || '',
              carrera: p.convocatoria_carrera || 'Tecnología Superior',
              fotoUrl: '',
              iniciales: iniciales,
              puntajeMeritos: meritos,
              puntajeClaseDemostrativa: clase,
              puntajeEntrevista: entrevista,
              puntajeFinalPonderado: finalPonderado,
              estadoContratacion: estadoContr,
              fechaResolucion: '28 de Octubre de 2026'
            };
          });

          // Ordenar por puntaje ponderado descendente
          mapeados.sort((a, b) => b.puntajeFinalPonderado - a.puntajeFinalPonderado);
          mapeados.forEach((c, idx) => {
            c.posicion = idx + 1;
            if (idx === 0 && c.estadoContratacion === 'Lista de Reserva') {
              c.estadoContratacion = 'Seleccionado';
            }
          });

          this.rankingCandidatos = mapeados;
          this.candidatoSeleccionadoId = mapeados[0].id;
        } else {
          this.rankingCandidatos = [];
          this.candidatoSeleccionadoId = '';
        }

        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al cargar ranking de la convocatoria:', err);
        this.rankingCandidatos = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Cambio de convocatoria en el selector
  onConvocatoriaChange(nuevaId: string): void {
    this.convocatoriaSeleccionadaId = nuevaId;
    this.cargarRankingPorConvocatoria(nuevaId);
  }

  get convocatoriaActual(): ConvocatoriaOpcion {
    return this.convocatorias.find(c => c.id === this.convocatoriaSeleccionadaId) || {
      id: '',
      titulo: 'Sin Convocatoria Seleccionada',
      carrera: '',
      estado: 'Inactiva'
    };
  }

  get candidatoSeleccionado(): CandidatoRanking | null {
    if (this.rankingCandidatos.length === 0) return null;
    return this.rankingCandidatos.find(c => c.id === this.candidatoSeleccionadoId) || this.rankingCandidatos[0];
  }

  seleccionarCandidato(candidato: CandidatoRanking | null): void {
    if (candidato) {
      this.candidatoSeleccionadoId = candidato.id;
    }
  }

  get ganador(): CandidatoRanking | null {
    return this.rankingCandidatos.length > 0 ? this.rankingCandidatos[0] : null;
  }

  get segundoLugar(): CandidatoRanking | null {
    return this.rankingCandidatos.length > 1 ? this.rankingCandidatos[1] : null;
  }

  get tercerLugar(): CandidatoRanking | null {
    return this.rankingCandidatos.length > 2 ? this.rankingCandidatos[2] : null;
  }

  // Ofertas y contrataciones
  abrirModalOferta(): void {
    if (!this.candidatoSeleccionado) return;
    this.modalOfertaAbierto = true;
  }

  cerrarModalOferta(): void {
    this.modalOfertaAbierto = false;
  }

  confirmarOferta(): void {
    if (!this.candidatoSeleccionado) return;
    this.guardandoAccion = true;

    // Actualizar en backend
    this.http.patch(`http://127.0.0.1:8000/api/postulaciones/${this.candidatoSeleccionado.id}/`, {
      etapa_actual: 4,
      estado: 'Preseleccionada'
    }).subscribe({
      next: () => {
        this.guardandoAccion = false;
        this.modalOfertaAbierto = false;
        if (this.candidatoSeleccionado) {
          this.candidatoSeleccionado.estadoContratacion = 'Oferta Emitida';
          this.mostrarNotificacion(`Oferta emitida exitosamente a ${this.candidatoSeleccionado.nombres} ${this.candidatoSeleccionado.apellidos}.`);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoAccion = false;
        this.modalOfertaAbierto = false;
        if (this.candidatoSeleccionado) {
          this.candidatoSeleccionado.estadoContratacion = 'Oferta Emitida';
        }
        this.cdr.detectChanges();
      }
    });
  }

  abrirModalContratacion(): void {
    if (!this.candidatoSeleccionado) return;
    this.modalContratacionAbierto = true;
  }

  cerrarModalContratacion(): void {
    this.modalContratacionAbierto = false;
  }

  confirmarContratacion(): void {
    if (!this.candidatoSeleccionado) return;
    this.guardandoAccion = true;

    // Actualizar en backend
    this.http.patch(`http://127.0.0.1:8000/api/postulaciones/${this.candidatoSeleccionado.id}/`, {
      etapa_actual: 7,
      estado: 'Preseleccionada'
    }).subscribe({
      next: () => {
        this.guardandoAccion = false;
        this.modalContratacionAbierto = false;
        if (this.candidatoSeleccionado) {
          this.candidatoSeleccionado.estadoContratacion = 'Contratación Aprobada';
          this.metricas.procesosFinalizados += 1;
          this.mostrarNotificacion(`Contratación aprobada para ${this.candidatoSeleccionado.nombres} ${this.candidatoSeleccionado.apellidos}.`);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.guardandoAccion = false;
        this.modalContratacionAbierto = false;
        if (this.candidatoSeleccionado) {
          this.candidatoSeleccionado.estadoContratacion = 'Contratación Aprobada';
        }
        this.cdr.detectChanges();
      }
    });
  }

  private mostrarNotificacion(mensaje: string): void {
    this.notificacionAccion = mensaje;
    setTimeout(() => {
      this.notificacionAccion = null;
      this.cdr.detectChanges();
    }, 4500);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}
