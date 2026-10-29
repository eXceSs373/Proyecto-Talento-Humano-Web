import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { ConvocatoriasService } from '../../services/convocatorias';

// Estructura de la vacante que viene de Django
export interface VacanteInicio {
  id: string;
  codigo?: string;
  titulo: string;
  carrera: string;
  area: string;
  ubicacion?: string;
  modalidad: 'Presencial' | 'Híbrido' | 'Remoto';
  jornada: string;
  nivel: string;
  fecha_creacion?: string;
  tiempoPublicado?: string;
  descripcion_corta?: string;
  descripcionCorta?: string;
  tags: string[];
  activa?: boolean;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.scss']
})
export class InicioComponent implements OnInit {
  isDarkMode = false;
  cargando = true;

  // Para los filtros de busqueda
  busqueda: string = '';
  areaSeleccionada: string = 'Todas';
  modalidadSeleccionada: string = 'Todas';

  readonly areas: string[] = ['Tecnología', 'Diseño', 'Administración', 'Salud'];
  readonly modalidades: string[] = ['Presencial', 'Híbrido', 'Remoto'];

  // Para guardar las convocatorias que vienen de Django
  vacantes: VacanteInicio[] = [];

  // Inyeccion de servicios
  private router = inject(Router);
  public authService = inject(AuthService);
  private convocatoriasService = inject(ConvocatoriasService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }
    // Si ya hay convocatorias en memoria las cargamos de inmediato
    const enMemoria = this.convocatoriasService.vacantesActuales();
    if (enMemoria && enMemoria.length > 0) {
      this.vacantes = enMemoria.filter((v: any) => v.activa !== false);
      if (this.vacantes.length === 0) {
        this.vacantes = enMemoria;
      }
      this.cargando = false;
    }
    // Carga o actualiza las convocatorias desde la base de datos de Django
    this.cargarVacantes();
  }

  // Traer las convocatorias desde la base de datos de Django
  cargarVacantes(): void {
    this.cargando = this.vacantes.length === 0;
    this.convocatoriasService.obtenerConvocatorias().subscribe({
      next: (respuesta: any) => {
        const lista = Array.isArray(respuesta) ? respuesta : (respuesta?.results || []);
        console.log('Convocatorias cargadas desde Django:', lista);
        // Filtramos las activas; si ninguna tiene activa=true pero existen registros se muestran para no bloquear la vista
        const activas = lista.filter((v: any) => v.activa !== false);
        this.vacantes = activas.length > 0 ? activas : lista;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al traer las vacantes de Django:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Formatear fechas ISO que vienen de Django
  formatearFecha(fechaStr?: string): string {
    if (!fechaStr) return 'Publicado recientemente';
    try {
      const fecha = new Date(fechaStr);
      if (isNaN(fecha.getTime())) return fechaStr;
      return fecha.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fechaStr;
    }
  }

  // Para cambiar entre modo claro y oscuro
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

  // Para filtrar por texto, area y modalidad
  get vacantesFiltradas(): VacanteInicio[] {
    return this.vacantes.filter(v => {
      const termino = this.busqueda.trim().toLowerCase();
      const desc = (v.descripcion_corta || v.descripcionCorta || '').toLowerCase();
      const coincideTexto = !termino ||
        v.titulo.toLowerCase().includes(termino) ||
        v.carrera.toLowerCase().includes(termino) ||
        desc.includes(termino) ||
        (v.tags && v.tags.some(t => t.toLowerCase().includes(termino)));

      const coincideArea = this.areaSeleccionada === 'Todas' || v.area === this.areaSeleccionada;
      const coincideModalidad = this.modalidadSeleccionada === 'Todas' || v.modalidad === this.modalidadSeleccionada;

      return coincideTexto && coincideArea && coincideModalidad;
    });
  }

  // Para limpiar los filtros
  limpiarFiltros(): void {
    this.busqueda = '';
    this.areaSeleccionada = 'Todas';
    this.modalidadSeleccionada = 'Todas';
  }

  // Eliminar convocatoria (exclusivo para Administrador Técnico y Talento Humano)
  eliminarConvocatoria(vacante: VacanteInicio, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const confirmado = confirm(`¿Estás seguro de que deseas eliminar la convocatoria "${vacante.titulo}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    this.convocatoriasService.eliminarConvocatoria(vacante.id).subscribe({
      next: () => {
        this.vacantes = this.vacantes.filter(v => String(v.id) !== String(vacante.id));
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al eliminar la convocatoria de Django:', err);
        alert('No se pudo eliminar la convocatoria. Verifica la conexión con el servidor Django.');
      }
    });
  }

  // Para ir al formulario de postulacion con los datos de la vacante
  postularse(vacante: VacanteInicio): void {
    this.router.navigate(['/postulacion'], {
      queryParams: {
        id: vacante.id,
        titulo: vacante.titulo,
        carrera: vacante.carrera,
        modalidad: vacante.modalidad
      }
    });
  }

  // Para cerrar sesion
  cerrarSesion(): void {
    this.authService.logout();
  }

  // Para redirigir al panel segun el rol
  irAlPanel(): void {
    const usuario = this.authService.usuarioActual();
    if (usuario) {
      const ruta = this.authService.obtenerRutaPorDefecto(usuario.rol);
      this.router.navigate([ruta]);
    } else {
      this.router.navigate(['/login']);
    }
  }
}
