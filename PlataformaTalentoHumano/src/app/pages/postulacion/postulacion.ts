import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, getApiBaseUrl } from '../../services/auth.service';

export interface DocumentoCV {
  nombre: string;
  tamano: string;
  fechaCarga: string;
}

export interface VacanteDetalle {
  id: string | number;
  titulo: string;
  carrera: string;
  departamento: string;
  ubicacion: string;
  modalidad: string;
  jornada: string;
  requisitos: string[];
}

@Component({
  selector: 'app-postulacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './postulacion.html',
  styleUrls: ['./postulacion.scss']
})
export class PostulacionComponent implements OnInit {
  isDarkMode: boolean = false;
  isDragging: boolean = false;
  enviando: boolean = false;
  postulacionEnviada: boolean = false;
  codigoExpediente: string = '';
  convocatoriaId: number = 1;

  // Datos de la vacante seleccionada
  vacante: VacanteDetalle = {
    id: 1,
    titulo: 'Docente en Desarrollo de Software - Convocatoria 2026',
    carrera: 'Tecnología Superior en Desarrollo de Software',
    departamento: 'Coordinación Académica de Tecnologías',
    ubicacion: 'Loja, Ecuador - Campus Matriz',
    modalidad: 'Presencial',
    jornada: 'Tiempo Completo',
    requisitos: [
      'Título de 3er o 4to nivel en Sistemas, Computación o afines',
      'Registro oficial de título acreditado en Senescyt',
      'Mínimo 2 años de experiencia profesional o docente',
      'Disponibilidad para jornada académica presencial'
    ]
  };

  // Datos del postulante
  perfil = {
    nombres: '',
    apellidos: '',
    cedula: '',
    correo: '',
    telefono: '',
    tituloAcademico: '',
    aniosExperiencia: null as number | null,
    enlacePortafolio: '',
    resumenPerfil: '',
    terminosAceptados: false
  };

  // Archivo PDF del CV
  archivoCv: DocumentoCV | null = null;
  archivoReal: File | null = null;

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    // Comprobar autenticación del postulante
    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/postulacion' } });
      return;
    }

    if (usuario.rol !== 'POSTULANTE') {
      alert('Acceso restringido: Las cuentas del personal institucional no pueden postularse. Esta acción es exclusiva para aspirantes y postulantes externos.');
      this.router.navigate(['/inicio']);
      return;
    }

    // Precargar datos del perfil con la cuenta autenticada
    this.perfil.nombres = usuario.nombres || usuario.nombre?.split(' ')[0] || '';
    this.perfil.apellidos = usuario.apellidos || (usuario.nombre?.split(' ').slice(1).join(' ')) || '';
    this.perfil.cedula = usuario.cedula || '';
    this.perfil.correo = usuario.correo || '';
    this.perfil.telefono = usuario.telefono || '';

    // Para recibir datos por la url
    this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.convocatoriaId = Number(params['id']);
        this.vacante.id = this.convocatoriaId;
      }
      if (params['titulo']) {
        this.vacante.titulo = params['titulo'];
      }
      if (params['carrera']) {
        this.vacante.carrera = params['carrera'];
      }
      if (params['modalidad']) {
        this.vacante.modalidad = params['modalidad'];
      }

      // Si no viene ID, verificar si hay convocatorias en Django para asignar la primera
      if (!params['id']) {
        this.http.get<any[]>(`${getApiBaseUrl()}/api/convocatorias/`).subscribe({
          next: (convs) => {
            if (convs && convs.length > 0) {
              const primera = convs[0];
              this.convocatoriaId = primera.id;
              this.vacante.id = primera.id;
              if (!params['titulo']) this.vacante.titulo = primera.titulo;
              if (!params['carrera']) this.vacante.carrera = primera.carrera;
              if (!params['modalidad']) this.vacante.modalidad = primera.modalidad;
              this.cdr.detectChanges();
            }
          },
          error: (err) => console.warn('No se pudo precargar convocatoria inicial:', err)
        });
      }
    });
  }

  // Para cambiar el tema oscuro
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

  // Para recibir el archivo arrastrado
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.procesarArchivo(file);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.procesarArchivo(file);
    }
  }

  // Para validar y guardar el archivo PDF
  private procesarArchivo(file: File): void {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor selecciona un archivo en formato PDF.');
      return;
    }

    const LIMITE_MB = 50;
    const pesoMB = file.size / (1024 * 1024);
    if (pesoMB > LIMITE_MB) {
      alert(`El archivo seleccionado tiene un peso de ${pesoMB.toFixed(1)} MB y supera el límite máximo permitido de ${LIMITE_MB} MB.`);
      return;
    }

    const tamanoMB = pesoMB.toFixed(2);
    this.archivoReal = file;
    this.archivoCv = {
      nombre: file.name,
      tamano: `${tamanoMB} MB`,
      fechaCarga: new Date().toLocaleDateString('es-EC')
    };
  }

  // Para quitar el archivo
  removerArchivo(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.archivoCv = null;
    this.archivoReal = null;
  }

  // Para enviar la postulacion real a la base de datos MySQL mediante Django DRF
  enviarPostulacion(): void {
    if (!this.perfil.nombres || !this.perfil.apellidos || !this.perfil.cedula || !this.perfil.correo) {
      alert('Por favor completa todos los campos obligatorios del Perfil Profesional.');
      return;
    }

    if (!this.archivoCv) {
      alert('Debes adjuntar tu Hoja de Vida en formato PDF antes de enviar.');
      return;
    }

    if (!this.perfil.terminosAceptados) {
      alert('Debes certificar la veracidad de los datos y aceptar los términos de la convocatoria.');
      return;
    }

    const usuario = this.authService.usuarioActual();
    if (!usuario) {
      alert('Debes iniciar sesión para postular.');
      this.router.navigate(['/login']);
      return;
    }

    this.enviando = true;

    // 1. Guardar el archivo PDF real y sus metadatos en Django
    const formData = new FormData();
    if (this.archivoReal) {
      formData.append('archivo_pdf', this.archivoReal, this.archivoReal.name);
    }
    formData.append('nombre_archivo', `CV_ISTS_${this.perfil.cedula}_${Date.now()}.pdf`);
    formData.append('nombre_original', this.archivoCv.nombre);
    formData.append('tamanio', this.archivoCv.tamano);
    formData.append('estado', 'Activo');

    this.http.post<any>(`${getApiBaseUrl()}/api/expedientes/`, formData).subscribe({
      next: (expedienteCreado) => {
        // 2. Registrar la postulación vinculada a la vacante y al usuario
        const aniosExp = this.perfil.aniosExperiencia || 1;
        const meritosCalculados = Math.min(100, Math.max(50, 70 + (aniosExp * 5)));

        const postPayload = {
          usuario: usuario.id,
          convocatoria: this.convocatoriaId,
          expediente_cv: expedienteCreado.id,
          titulo_profesional: this.perfil.tituloAcademico || 'Profesional Postulante',
          institucion_titulo: 'Institución de Educación Superior Registrada',
          anios_experiencia_profesional: aniosExp,
          anios_experiencia_docente: 0,
          puntaje_meritos: meritosCalculados,
          etapa_actual: 2,
          estado: 'Recibida'
        };

        this.http.post<any>(`${getApiBaseUrl()}/api/postulaciones/`, postPayload).subscribe({
          next: (postulacionCreada) => {
            this.enviando = false;
            this.codigoExpediente = postulacionCreada.numero_tramite || `ISTS-POST-2026-${postulacionCreada.id}`;
            this.postulacionEnviada = true;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error al registrar la postulación:', err);
            this.enviando = false;
            alert('No se pudo guardar la postulación en la base de datos.');
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.error('Error al crear expediente digital:', err);
        this.enviando = false;
        alert('Ocurrió un error al procesar el archivo de hoja de vida.');
        this.cdr.detectChanges();
      }
    });
  }

  irAMiPostulacion(): void {
    this.postulacionEnviada = false;
    this.router.navigate(['/mi-postulacion']);
  }

  cerrarModalExito(): void {
    this.postulacionEnviada = false;
    this.router.navigate(['/mi-postulacion']);
  }
}
