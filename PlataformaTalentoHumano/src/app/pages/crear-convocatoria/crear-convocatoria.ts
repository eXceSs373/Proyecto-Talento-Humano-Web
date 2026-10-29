import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ConvocatoriasService } from '../../services/convocatorias';

@Component({
  selector: 'app-crear-convocatoria',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './crear-convocatoria.html',
  styleUrls: ['./crear-convocatoria.scss']
})
export class CrearConvocatoriaComponent implements OnInit {
  isDarkMode = false;
  guardando = false;
  mensajeExito: string | null = null;
  mensajeError: string | null = null;
  camposConError: string[] = [];

  // Lista interactiva de etiquetas seleccionadas
  tagsSeleccionados: string[] = ['Docencia Superior', 'Desarrollo Web'];
  nuevoTagTexto: string = '';

  // Sugerencias rapidas de etiquetas
  readonly tagsSugeridos: string[] = [
    'Angular',
    'Python',
    'Full Stack',
    'SENESCYT',
    'Metodologías Ágiles',
    'Bases de Datos',
    'Investigación',
    'Pedagogía'
  ];

  // Listas de opciones institucionales
  readonly carreras: string[] = [
    'Tecnología Superior en Desarrollo de Software',
    'Diseño Gráfico',
    'Administración',
    'Enfermería',
    'Gastronomía',
    'Marketing Digital',
    'Talento Humano',
    'Turismo y Hotelería'
  ];

  readonly areas: string[] = [
    'Tecnología',
    'Diseño',
    'Administración',
    'Salud',
    'Educación y Servicios'
  ];

  readonly modalidades: string[] = [
    'Presencial',
    'Híbrido',
    'Remoto'
  ];

  readonly jornadas: string[] = [
    'Tiempo Completo',
    'Medio Tiempo',
    'Tiempo Parcial'
  ];

  readonly niveles: string[] = [
    'Docente Titular Auxiliar',
    'Docente Titular Agregado',
    'Docente Titular Principal',
    'Docente Ocasional',
    'Técnico Docente'
  ];

  // Inyeccion de servicios
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public authService = inject(AuthService);
  private convocatoriasService = inject(ConvocatoriasService);
  private cdr = inject(ChangeDetectorRef);

  // Formulario reactivo para la convocatoria
  formularioConvocatoria: FormGroup = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(4)]],
    titulo: ['', [Validators.required, Validators.minLength(6)]],
    carrera: ['Tecnología Superior en Desarrollo de Software', Validators.required],
    area: ['Tecnología', Validators.required],
    modalidad: ['Presencial', Validators.required],
    jornada: ['Tiempo Completo', Validators.required],
    nivel: ['Docente Titular Auxiliar', Validators.required],
    descripcion_corta: ['', [Validators.required, Validators.minLength(20)]],
    activa: [true]
  });

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }
    this.generarCodigoSugerido();
  }

  // Generar un codigo sugerido segun la carrera y el anio
  generarCodigoSugerido(): void {
    const anio = new Date().getFullYear();
    const carrera = this.formularioConvocatoria.get('carrera')?.value || 'DOC';
    let prefijo = 'DOC-GEN';

    if (carrera.includes('Software')) prefijo = 'DOC-DS';
    else if (carrera.includes('Diseño')) prefijo = 'DOC-DG';
    else if (carrera.includes('Administración')) prefijo = 'DOC-ADM';
    else if (carrera.includes('Enfermería')) prefijo = 'DOC-ENF';
    else if (carrera.includes('Gastronomía')) prefijo = 'DOC-GAS';
    else if (carrera.includes('Marketing')) prefijo = 'DOC-MKT';

    const aleatorio = Math.floor(100 + Math.random() * 900);
    this.formularioConvocatoria.patchValue({
      codigo: `${prefijo}-${anio}-${aleatorio}`
    });
  }

  // Al cambiar la carrera sugerimos un nuevo codigo coherente
  onCambioCarrera(): void {
    this.generarCodigoSugerido();
  }

  // Anadir etiqueta desde el input
  agregarTag(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const tagLimpio = this.nuevoTagTexto.trim();
    if (tagLimpio && !this.tagsSeleccionados.includes(tagLimpio)) {
      this.tagsSeleccionados.push(tagLimpio);
      this.nuevoTagTexto = '';
    }
  }

  // Anadir etiqueta desde las sugerencias
  agregarTagSugerido(tag: string): void {
    if (!this.tagsSeleccionados.includes(tag)) {
      this.tagsSeleccionados.push(tag);
    }
  }

  // Quitar una etiqueta
  quitarTag(index: number): void {
    this.tagsSeleccionados.splice(index, 1);
  }

  // Obtener lista legible de campos faltantes o invalidos
  obtenerCamposFaltantes(): string[] {
    const faltantes: string[] = [];
    const controles = this.formularioConvocatoria.controls;

    if (controles['codigo'].invalid) {
      if (controles['codigo'].errors?.['required']) {
        faltantes.push('Código de la convocatoria');
      } else if (controles['codigo'].errors?.['minlength']) {
        faltantes.push('Código de la convocatoria (mínimo 4 caracteres)');
      }
    }

    if (controles['titulo'].invalid) {
      if (controles['titulo'].errors?.['required']) {
        faltantes.push('Título del puesto');
      } else if (controles['titulo'].errors?.['minlength']) {
        faltantes.push('Título del puesto (mínimo 6 caracteres)');
      }
    }

    if (controles['carrera'].invalid) {
      faltantes.push('Carrera');
    }

    if (controles['area'].invalid) {
      faltantes.push('Área');
    }

    if (controles['modalidad'].invalid) {
      faltantes.push('Modalidad de trabajo');
    }

    if (controles['jornada'].invalid) {
      faltantes.push('Horario de trabajo');
    }

    if (controles['nivel'].invalid) {
      faltantes.push('Nivel del cargo');
    }

    if (controles['descripcion_corta'].invalid) {
      if (controles['descripcion_corta'].errors?.['required']) {
        faltantes.push('Descripción del puesto');
      } else if (controles['descripcion_corta'].errors?.['minlength']) {
        const actuales = (controles['descripcion_corta'].value || '').length;
        faltantes.push(`Descripción del puesto (mínimo 20 caracteres, tienes ${actuales})`);
      }
    }

    if (this.tagsSeleccionados.length === 0) {
      faltantes.push('Al menos una palabra clave (etiqueta requerida)');
    }

    return faltantes;
  }

  // Enviar el formulario a la API de Django
  guardarConvocatoria(): void {
    this.mensajeError = null;
    this.mensajeExito = null;
    this.camposConError = [];

    // Validacion previa
    if (this.formularioConvocatoria.invalid || this.tagsSeleccionados.length === 0) {
      this.formularioConvocatoria.markAllAsTouched();
      this.camposConError = this.obtenerCamposFaltantes();
      this.mensajeError = 'Por favor completa todos los campos requeridos correctamente:';

      // Desplazamiento suave hacia arriba para ver el mensaje
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      this.cdr.detectChanges();
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const payload = {
      ...this.formularioConvocatoria.value,
      codigo: this.formularioConvocatoria.value.codigo.toUpperCase().trim(),
      tags: this.tagsSeleccionados
    };

    this.convocatoriasService.crearConvocatoria(payload).subscribe({
      next: (resultado: any) => {
        this.guardando = false;
        this.mensajeExito = `Convocatoria "${resultado.titulo || payload.titulo}" publicada con éxito.`;
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('Error al guardar convocatoria en Django:', err);
        if (err.status === 400 && err.error?.codigo) {
          this.mensajeError = 'El código ingresado ya se encuentra registrado. Utiliza otro código único.';
        } else if (err.status === 0) {
          this.mensajeError = 'No se pudo conectar con el servidor Django en el puerto 8000. Asegúrate de tener corriendo "python manage.py runserver".';
        } else {
          this.mensajeError = 'Ocurrió un error al guardar en la base de datos. Verifica que el servidor Django esté activo.';
        }
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Restablecer el formulario para crear otra vacante
  crearOtra(): void {
    this.mensajeExito = null;
    this.mensajeError = null;
    this.tagsSeleccionados = ['Docencia Superior'];
    this.formularioConvocatoria.reset({
      carrera: 'Desarrollo de Software',
      area: 'Tecnología',
      modalidad: 'Presencial',
      jornada: 'Tiempo Completo',
      nivel: 'Docente Titular Auxiliar',
      descripcion_corta: '',
      activa: true
    });
    this.generarCodigoSugerido();
  }

  // Redirigir al portal publico
  irAlPortal(): void {
    this.router.navigate(['/inicio']);
  }

  // Cambiar entre modo claro y oscuro
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

  // Cerrar sesion
  cerrarSesion(): void {
    this.authService.logout();
  }
}
