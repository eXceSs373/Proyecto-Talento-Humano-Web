import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, getApiBaseUrl } from '../../services/auth.service';

export interface UsuarioPostulanteBD {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  cedula: string;
  telefono: string;
  rol: string;
  departamento: string;
  date_joined?: string;
  is_active?: boolean;
  vigenciaArchivo?: string;
  estadoArchivo?: 'activo' | 'caducado' | 'vacio';
}

@Component({
  selector: 'app-admin-postulantes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './admin-postulantes.html',
  styleUrls: ['./admin-postulantes.scss']
})
export class AdminPostulantesComponent implements OnInit {
  isDarkMode = false;
  cargando = true;
  postulantes: UsuarioPostulanteBD[] = [];

  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    // Comprobar que sea el Administrador Técnico
    const usuario = this.authService.usuarioActual();
    if (!usuario || usuario.rol !== 'ADMIN_TECNICO') {
      alert('Acceso restringido: Esta vista es de uso exclusivo para el Administrador Técnico.');
      this.router.navigate(['/inicio']);
      return;
    }

    this.cargarPostulantesBD();
  }

  cargarPostulantesBD(): void {
    this.cargando = true;
    const urlUsuarios = `${getApiBaseUrl()}/api/usuarios/?rol=POSTULANTE&_t=${Date.now()}`;
    const urlPostulaciones = `${getApiBaseUrl()}/api/postulaciones/?_t=${Date.now()}`;

    this.http.get<UsuarioPostulanteBD[]>(urlUsuarios).subscribe({
      next: (usuarios) => {
        const listaUsuarios = Array.isArray(usuarios) ? usuarios : [];

        // Obtener postulaciones para cruzar la vigencia del expediente de cada postulante
        this.http.get<any[]>(urlPostulaciones).subscribe({
          next: (postulaciones) => {
            const listaPostulaciones = Array.isArray(postulaciones) ? postulaciones : [];

            listaUsuarios.forEach(u => {
              const post = listaPostulaciones.find(p => String(p.usuario) === String(u.id) || p.usuario_cedula === u.cedula);
              if (post && post.expediente_fecha_caducidad) {
                const fechaCad = new Date(post.expediente_fecha_caducidad);
                const hoy = new Date();
                const diffDias = Math.ceil((fechaCad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDias > 0) {
                  u.vigenciaArchivo = `${diffDias} días restantes`;
                  u.estadoArchivo = 'activo';
                } else {
                  u.vigenciaArchivo = 'Caducado';
                  u.estadoArchivo = 'caducado';
                }
              } else {
                u.vigenciaArchivo = 'Sin archivo';
                u.estadoArchivo = 'vacio';
              }
            });

            // Orden ascendente natural por ID (1, 2, 3...)
            listaUsuarios.sort((a, b) => a.id - b.id);

            this.postulantes = listaUsuarios;
            this.cargando = false;
            this.cdr.detectChanges();
          },
          error: () => {
            listaUsuarios.sort((a, b) => a.id - b.id);
            this.postulantes = listaUsuarios;
            this.cargando = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        console.warn('Error al cargar cuentas de postulantes:', err);
        this.postulantes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatearFecha(fechaStr?: string): string {
    if (!fechaStr) return 'No registrada';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return fechaStr;
    }
  }

  regresar(): void {
    this.router.navigate(['/inicio']);
  }
}
