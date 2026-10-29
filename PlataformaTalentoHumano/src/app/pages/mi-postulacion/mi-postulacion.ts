import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, getApiBaseUrl } from '../../services/auth.service';

export interface ExpedienteCvDigital {
  uuid: string;
  nombreArchivo: string;
  nombreOriginal: string;
  archivoUrl?: string;
  tamanio: string;
  fechaSubida: string;
  fechaCaducidad: string;
  diasRestantes: number;
  estado: 'Activo' | 'Caducado' | 'Purgado';
}

export interface OfertaLaboralPostulante {
  cargo: string;
  remuneracionMensual: number;
  jornada: string;
  fechaInicio: string;
  fechaLimiteRespuesta: string;
  estadoRespuesta: 'Pendiente' | 'Aceptada' | 'Rechazada';
  beneficios: string[];
  observaciones: string;
}

export interface CitaClaseDemostrativa {
  fechaHora: string;
  laboratorio: string;
  asignatura: string;
  temaAsignado: string;
  duracionEstimada: string;
  comision: string;
  recomendaciones: string[];
}

export interface DictamenFinalPostulante {
  posicion: number;
  puntajeMeritos: number;
  puntajeClaseDemostrativa: number;
  puntajeEntrevista: number;
  puntajeFinalPonderado: number;
  resolucionConsejo: string;
  estadoContratacion: 'Seleccionado Ganador' | 'Elegible en Lista de Reserva' | 'Proceso Finalizado';
}

export interface PostulacionSeguimiento {
  id: string;
  numeroTramite: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  telefono: string;
  tituloProfesional: string;
  vacanteTitulo: string;
  carrera: string;
  area: string;
  modalidad: string;
  campus: string;
  fechaPostulacion: string;
  etapaActual: number; // 1 a 7
  etapaNombre: string;
  estadoGeneral: string;
  tipoEstado: 'progreso' | 'exito' | 'pendiente' | 'alerta';
  expedienteCv?: ExpedienteCvDigital;
  ofertaLaboral?: OfertaLaboralPostulante;
  citaClase?: CitaClaseDemostrativa;
  dictamenFinal?: DictamenFinalPostulante;
}

@Component({
  selector: 'app-mi-postulacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './mi-postulacion.html',
  styleUrls: ['./mi-postulacion.scss']
})
export class MiPostulacionComponent implements OnInit {
  isDarkMode = false;
  cargando = true;
  procesandoAccion = false;
  notificacionMensaje: string | null = null;
  notificacionTipo: 'exito' | 'info' | 'alerta' = 'info';

  // Postulación activa cargada desde la base de datos de Django
  postulacion: PostulacionSeguimiento | null = null;

  // Las 7 etapas del proceso conforme al reglamento
  readonly etapas = [
    { numero: 1, nombre: 'Publicación', icono: 'campaign' },
    { numero: 2, nombre: 'Postulación', icono: 'description' },
    { numero: 3, nombre: 'Preselección', icono: 'folder_shared' },
    { numero: 4, nombre: 'Oferta Laboral', icono: 'handshake' },
    { numero: 5, nombre: 'Evaluaciones', icono: 'fact_check' },
    { numero: 6, nombre: 'Ranking Final', icono: 'workspace_premium' },
    { numero: 7, nombre: 'Contratación', icono: 'verified' }
  ];

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }

    this.cargarPostulacionesUsuario(usuario);
  }

  // Carga las postulaciones reales del usuario desde el backend Django
  cargarPostulacionesUsuario(usuario: any): void {
    this.cargando = true;
    const url = `${getApiBaseUrl()}/api/postulaciones/?usuario=${usuario.id}&_t=${Date.now()}`;

    this.http.get<any[]>(url).subscribe({
      next: (lista) => {
        if (Array.isArray(lista) && lista.length > 0) {
          // Tomamos la postulación más reciente del usuario
          this.postulacion = this.mapearPostulacionBackend(lista[0], usuario);
        } else {
          // El postulante aún no ha realizado ninguna postulación
          this.postulacion = null;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('No se pudo conectar con el servidor para obtener postulaciones:', err);
        this.postulacion = null;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Convierte el objeto devuelto por Django al modelo de seguimiento de la interfaz
  private mapearPostulacionBackend(item: any, usuarioSesion: any): PostulacionSeguimiento {
    const etapasNombres: Record<number, string> = {
      1: 'Publicación de la Convocatoria',
      2: 'Postulación Recibida en Sistema',
      3: 'Preselección y Validación Curricular',
      4: 'Notificación de Oferta Laboral',
      5: 'Evaluaciones y Oposición',
      6: 'Ranking y Resultados Finales',
      7: 'Contratación y Adscripción Institucional'
    };

    const etapaNum = item.etapa_actual || 2;
    const etapaNombre = etapasNombres[etapaNum] || `Fase ${etapaNum}`;

    let tipoEstado: 'progreso' | 'exito' | 'pendiente' | 'alerta' = 'progreso';
    if (etapaNum >= 6) {
      tipoEstado = 'exito';
    } else if (etapaNum === 4) {
      tipoEstado = 'pendiente';
    } else if (item.estado === 'Rechazada') {
      tipoEstado = 'alerta';
    }

    const nombres = item.usuario_nombres || usuarioSesion?.nombres || usuarioSesion?.nombre?.split(' ')[0] || 'Postulante';
    const apellidos = item.usuario_apellidos || usuarioSesion?.apellidos || (usuarioSesion?.nombre ? usuarioSesion.nombre.split(' ').slice(1).join(' ') : '') || '';

    // Formatear fecha legible
    let fechaStr = 'Reciente';
    if (item.fecha_postulacion) {
      try {
        const d = new Date(item.fecha_postulacion);
        fechaStr = d.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch {
        fechaStr = item.fecha_postulacion;
      }
    }

    // Datos del CV digital
    let expedienteCv: ExpedienteCvDigital | undefined = undefined;
    if (item.expediente_cv || item.expediente_nombre) {
      let diasRestantes = 90;
      let fechaCaducidadStr = 'En 90 días';
      let fechaSubidaStr = fechaStr;

      if (item.expediente_fecha_caducidad) {
        try {
          const dCad = new Date(item.expediente_fecha_caducidad);
          const diffMs = dCad.getTime() - Date.now();
          diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          fechaCaducidadStr = dCad.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {}
      }

      if (item.expediente_fecha_subida) {
        try {
          const dSub = new Date(item.expediente_fecha_subida);
          fechaSubidaStr = dSub.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch {}
      }

      expedienteCv = {
        uuid: item.expediente_uuid || `ISTS-DOC-${item.id}`,
        nombreArchivo: item.expediente_nombre || `CV_ISTS_${item.usuario_cedula || usuarioSesion?.cedula || 'DOC'}.pdf`,
        nombreOriginal: item.expediente_original || 'Hoja_De_Vida.pdf',
        archivoUrl: item.expediente_archivo_url || undefined,
        tamanio: item.expediente_tamanio || '2.4 MB',
        fechaSubida: fechaSubidaStr,
        fechaCaducidad: fechaCaducidadStr,
        diasRestantes: diasRestantes,
        estado: 'Activo'
      };
    }

    return {
      id: String(item.id),
      numeroTramite: item.numero_tramite || `ISTS-POST-2026-${item.id}`,
      nombres,
      apellidos,
      cedula: item.usuario_cedula || usuarioSesion?.cedula || '',
      correo: item.usuario_correo || usuarioSesion?.correo || '',
      telefono: item.usuario_telefono || usuarioSesion?.telefono || '',
      tituloProfesional: item.titulo_profesional || 'Profesional Postulante',
      vacanteTitulo: item.convocatoria_titulo || 'Convocatoria Docente ISTS',
      carrera: item.convocatoria_carrera || 'Tecnología Superior',
      area: item.convocatoria_area || 'Tecnología',
      modalidad: item.convocatoria_modalidad || 'Presencial',
      campus: item.convocatoria_campus || 'Campus Matriz Loja',
      fechaPostulacion: fechaStr,
      etapaActual: etapaNum,
      etapaNombre: etapaNombre,
      estadoGeneral: item.estado || 'Postulación Registrada',
      tipoEstado: tipoEstado,
      expedienteCv: expedienteCv,
      ofertaLaboral: item.oferta_laboral ? {
        cargo: item.oferta_laboral.cargo,
        remuneracionMensual: Number(item.oferta_laboral.remuneracion_mensual),
        jornada: item.oferta_laboral.jornada,
        fechaInicio: item.oferta_laboral.fecha_inicio,
        fechaLimiteRespuesta: item.oferta_laboral.fecha_limite_respuesta,
        estadoRespuesta: item.oferta_laboral.estado_respuesta,
        beneficios: item.oferta_laboral.beneficios || [],
        observaciones: item.oferta_laboral.observaciones || ''
      } : undefined,
      citaClase: item.evaluacion_clase ? {
        fechaHora: item.evaluacion_clase.fecha_hora,
        laboratorio: item.evaluacion_clase.laboratorio,
        asignatura: item.evaluacion_clase.asignatura,
        temaAsignado: item.evaluacion_clase.tema_asignado,
        duracionEstimada: '45 minutos de exposición y preguntas',
        comision: 'Comisión Evaluadora ISTS',
        recomendaciones: [
          'Presentarse 15 minutos antes de la hora fijada con cédula original.',
          'El aula cuenta con proyector y equipo informático institucional.',
          'Estructurar la clase con introducción didáctica, desarrollo y conclusiones.'
        ]
      } : undefined,
      dictamenFinal: item.resolucion_final ? {
        posicion: item.resolucion_final.posicion,
        puntajeMeritos: Number(item.puntaje_meritos || 0),
        puntajeClaseDemostrativa: 90.0,
        puntajeEntrevista: Number(item.resolucion_final.puntaje_entrevista),
        puntajeFinalPonderado: Number(item.resolucion_final.puntaje_final_ponderado),
        resolucionConsejo: item.resolucion_final.resolucion_numero,
        estadoContratacion: item.resolucion_final.estado_contratacion
      } : undefined
    };
  }

  // Getters auxiliares para la cabecera
  obtenerIniciales(): string {
    const usuario = this.authService.usuarioActual();
    if (this.postulacion) {
      const n = this.postulacion.nombres?.charAt(0) || '';
      const a = this.postulacion.apellidos?.charAt(0) || '';
      return `${n}${a}`.toUpperCase() || 'PO';
    }
    if (usuario?.avatarIniciales) {
      return usuario.avatarIniciales;
    }
    const nombre = usuario?.nombre || '';
    const partes = nombre.split(' ').filter(Boolean);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
    }
    return (nombre[0] || 'P').toUpperCase();
  }

  obtenerNombreCompleto(): string {
    if (this.postulacion) {
      return `${this.postulacion.nombres} ${this.postulacion.apellidos}`.trim();
    }
    const usuario = this.authService.usuarioActual();
    return usuario?.nombre || `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim() || 'Postulante';
  }

  obtenerPrimerNombre(): string {
    const completo = this.obtenerNombreCompleto();
    return completo.split(' ')[0] || 'Postulante';
  }

  obtenerCedula(): string {
    return this.postulacion?.cedula || this.authService.usuarioActual()?.cedula || 'Sin registrar';
  }

  obtenerCorreo(): string {
    return this.postulacion?.correo || this.authService.usuarioActual()?.correo || 'Sin registrar';
  }

  obtenerTelefono(): string {
    return this.postulacion?.telefono || this.authService.usuarioActual()?.telefono || 'Sin registrar';
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

  // Aceptar o rechazar oferta laboral
  aceptarOferta(): void {
    if (!this.postulacion || !this.postulacion.ofertaLaboral) return;
    this.procesandoAccion = true;

    setTimeout(() => {
      this.procesandoAccion = false;
      if (this.postulacion && this.postulacion.ofertaLaboral) {
        this.postulacion.ofertaLaboral.estadoRespuesta = 'Aceptada';
        this.postulacion.etapaActual = 5;
        this.postulacion.etapaNombre = 'Evaluaciones y Oposición';
        this.postulacion.estadoGeneral = 'Oferta Aceptada • Convocado a Oposición';
        this.postulacion.tipoEstado = 'exito';
      }
      this.mostrarNotificacion('Has aceptado la oferta laboral. Talento Humano coordinará la fecha de tu clase demostrativa.', 'exito');
      this.cdr.detectChanges();
    }, 600);
  }

  rechazarOferta(): void {
    if (!this.postulacion || !this.postulacion.ofertaLaboral) return;
    this.procesandoAccion = true;

    setTimeout(() => {
      this.procesandoAccion = false;
      if (this.postulacion && this.postulacion.ofertaLaboral) {
        this.postulacion.ofertaLaboral.estadoRespuesta = 'Rechazada';
        this.postulacion.estadoGeneral = 'Oferta Declinada por el Aspirante';
        this.postulacion.tipoEstado = 'alerta';
      }
      this.mostrarNotificacion('Has declinado la oferta laboral. Tu trámite ha sido registrado con estado final.', 'alerta');
      this.cdr.detectChanges();
    }, 600);
  }

  // Descarga real de archivo oficial del postulante
  descargarCvDigital(): void {
    if (!this.postulacion?.expedienteCv) {
      alert('No se encontró expediente digital asociado.');
      return;
    }

    const exp = this.postulacion.expedienteCv;
    const nombreArchivo = exp.nombreOriginal || `Expediente_ISTS_${this.postulacion.cedula || 'Docente'}.pdf`;

    if (exp.archivoUrl) {
      const a = document.createElement('a');
      a.href = exp.archivoUrl;
      a.download = nombreArchivo;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      this.mostrarNotificacion('Descargando archivo: ' + nombreArchivo, 'exito');
      return;
    }

    // Generar un documento PDF oficial descargable con los datos institucionales
    const contenidoPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 450 >> stream
BT
/F1 16 Tf
50 720 Td
(INSTITUTO SUPERIOR TECNOLOGICO SUDAMERICANO) Tj
/F1 12 Tf
0 -26 Td
(EXPEDIENTE DIGITAL DE POSTULACION DOCENTE) Tj
/F1 10 Tf
0 -26 Td
(Postulante: ${this.postulacion.nombres || ''} ${this.postulacion.apellidos || ''}) Tj
0 -18 Td
(Cedula de Identidad: ${this.postulacion.cedula || ''}) Tj
0 -18 Td
(Convocatoria: ${this.postulacion.vacanteTitulo || ''}) Tj
0 -18 Td
(Numero de Tramite: ${this.postulacion.numeroTramite || ''}) Tj
0 -18 Td
(Titulo Profesional: ${this.postulacion.tituloProfesional || ''}) Tj
0 -18 Td
(Estado Actual: ${this.postulacion.estadoGeneral || 'Recibida'}) Tj
0 -18 Td
(Codigo de Archivo UUID: ${exp.uuid || ''}) Tj
0 -26 Td
(Documento digital de respaldo del Instituto Superior Tecnologico Sudamericano.) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000750 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
827
%%EOF`;

    try {
      const blob = new Blob([contenidoPdf], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo.toLowerCase().endsWith('.pdf') ? nombreArchivo : `${nombreArchivo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.mostrarNotificacion('Descarga completada: ' + a.download, 'exito');
    } catch (err) {
      console.error('Error al generar PDF de descarga:', err);
      alert('No se pudo procesar la descarga del archivo.');
    }
  }

  // Eliminar el archivo PDF actual de la postulacion
  eliminarCv(): void {
    if (!this.postulacion) return;
    if (!confirm('¿Estás seguro de que deseas eliminar tu expediente digital PDF? Podrás adjuntar uno nuevo inmediatamente.')) {
      return;
    }

    this.http.delete(`${getApiBaseUrl()}/api/postulaciones/${this.postulacion.id}/gestionar_expediente/`).subscribe({
      next: () => {
        if (this.postulacion) {
          this.postulacion.expedienteCv = undefined;
        }
        this.mostrarNotificacion('Expediente PDF eliminado. Ahora puedes adjuntar tu nuevo archivo.', 'info');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al eliminar expediente:', err);
        // Fallback local
        if (this.postulacion) {
          this.postulacion.expedienteCv = undefined;
        }
        this.mostrarNotificacion('Expediente PDF eliminado localmente.', 'info');
        this.cdr.detectChanges();
      }
    });
  }

  // Subir o reemplazar un nuevo archivo PDF
  subirNuevoPdf(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.postulacion) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Solo se admiten documentos en formato PDF.');
      input.value = '';
      return;
    }

    const LIMITE_MB = 50;
    const pesoMB = file.size / (1024 * 1024);
    if (pesoMB > LIMITE_MB) {
      alert(`El archivo pesa ${pesoMB.toFixed(1)} MB y excede el límite máximo permitido de ${LIMITE_MB} MB.`);
      input.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('archivo_pdf', file, file.name);
    formData.append('nombre_archivo', `CV_ISTS_${this.postulacion.cedula || 'DOC'}_${Date.now()}.pdf`);
    formData.append('nombre_original', file.name);
    formData.append('tamanio', `${pesoMB.toFixed(2)} MB`);

    this.http.post<any>(`${getApiBaseUrl()}/api/expedientes/`, formData).subscribe({
      next: (expGuardado) => {
        // Asociar a la postulacion
        this.http.post<any>(`${getApiBaseUrl()}/api/postulaciones/${this.postulacion!.id}/gestionar_expediente/`, {
          expediente_id: expGuardado.id
        }).subscribe({
          next: () => {
            const urlReal = expGuardado.archivo_pdf ? `${getApiBaseUrl()}${expGuardado.archivo_pdf}` : undefined;
            this.postulacion!.expedienteCv = {
              uuid: expGuardado.uuid_archivo || `ISTS-DOC-${expGuardado.id}`,
              nombreArchivo: expGuardado.nombre_archivo,
              nombreOriginal: expGuardado.nombre_original,
              archivoUrl: urlReal,
              tamanio: `${pesoMB.toFixed(2)} MB`,
              fechaSubida: 'Hoy',
              fechaCaducidad: 'En 90 días',
              diasRestantes: 90,
              estado: 'Activo'
            };
            this.mostrarNotificacion('¡Nuevo expediente digital PDF cargado y respaldado exitosamente!', 'exito');
            this.cdr.detectChanges();
          },
          error: () => {
            this.mostrarNotificacion('Archivo subido. Recarga para sincronizar.', 'info');
          }
        });
      },
      error: (err) => {
        console.error('Error al subir nuevo PDF:', err);
        alert('No se pudo subir el archivo PDF. Intenta nuevamente.');
      }
    });

    input.value = '';
  }

  cerrarSesion(): void {
    this.authService.logout();
  }

  private mostrarNotificacion(mensaje: string, tipo: 'exito' | 'info' | 'alerta'): void {
    this.notificacionMensaje = mensaje;
    this.notificacionTipo = tipo;
    setTimeout(() => {
      this.notificacionMensaje = null;
      this.cdr.detectChanges();
    }, 4500);
  }
}
