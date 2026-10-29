import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, of } from 'rxjs';

// Los 7 roles oficiales del sistema institucional
export type RolUsuario =
  | 'ADMIN_TECNICO'
  | 'TALENTO_HUMANO'
  | 'POSTULANTE'
  | 'RECTORADO'
  | 'VICERRECTORADO'
  | 'BIENESTAR'
  | 'COORDINADOR';

export interface UsuarioSesion {
  id: string;
  username: string;
  nombres: string;
  apellidos: string;
  nombre: string;
  correo: string;
  cedula: string;
  telefono?: string;
  rol: RolUsuario;
  rolEtiqueta: string;
  nombreRol: string;
  departamento: string;
  avatarIniciales: string;
  token?: string;
}

export interface RegistroPostulanteDto {
  nombres: string;
  apellidos: string;
  cedula: string;
  correo: string;
  telefono: string;
  contrasenia: string;
}

// Obtiene la URL base de Django de forma dinámica (localhost o IP de red local para acceso móvil)
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://127.0.0.1:8000';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'ists_usuario_sesion';
  
  get apiUrl(): string {
    return `${getApiBaseUrl()}/api/`;
  }

  // Usuario en sesion
  private usuarioSignal = signal<UsuarioSesion | null>(this.cargarSesionAlmacenada());

  // Datos publicos
  readonly usuarioActual = this.usuarioSignal.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioSignal() !== null);
  readonly rolActual = computed(() => this.usuarioSignal()?.rol || null);

  // Mapeo de credenciales de prueba predefinidas en la base de datos
  readonly credencialesDemo: Record<RolUsuario, { identificacion: string; contrasenia: string }> = {
    ADMIN_TECNICO: { identificacion: 'admin', contrasenia: '123456' },
    TALENTO_HUMANO: { identificacion: 'talentohumano', contrasenia: '123456' },
    RECTORADO: { identificacion: 'rectorado', contrasenia: '123456' },
    VICERRECTORADO: { identificacion: 'vicerrectorado', contrasenia: '123456' },
    COORDINADOR: { identificacion: 'coordinador', contrasenia: '123456' },
    BIENESTAR: { identificacion: 'bienestar', contrasenia: '123456' },
    POSTULANTE: { identificacion: 'juan', contrasenia: '123456' }
  };

  // Cuentas predefinidas de respaldo en caso de que el backend esté temporalmente apagado
  readonly cuentasPredefinidas: Record<RolUsuario, UsuarioSesion> = {
    ADMIN_TECNICO: {
      id: '1',
      username: 'admin',
      nombres: 'Administrador Técnico',
      apellidos: '',
      nombre: 'Administrador Técnico',
      correo: 'admin@ists.edu.ec',
      cedula: '1100000001',
      telefono: '0990000001',
      rol: 'ADMIN_TECNICO',
      rolEtiqueta: 'Administrador Técnico',
      nombreRol: 'Administrador Técnico',
      departamento: 'Unidad de Tecnologías de Información',
      avatarIniciales: 'AT',
      token: 'token-jwt-1-admin'
    },
    TALENTO_HUMANO: {
      id: '2',
      username: 'talentohumano',
      nombres: 'Talento Humano',
      apellidos: '',
      nombre: 'Talento Humano',
      correo: 'talento.humano@ists.edu.ec',
      cedula: '1100000002',
      telefono: '0990000002',
      rol: 'TALENTO_HUMANO',
      rolEtiqueta: 'Dirección de Talento Humano',
      nombreRol: 'Talento Humano',
      departamento: 'Dirección de Talento Humano',
      avatarIniciales: 'TH',
      token: 'token-jwt-2-talentohumano'
    },
    RECTORADO: {
      id: '3',
      username: 'rectorado',
      nombres: 'Rectorado',
      apellidos: '',
      nombre: 'Rectorado',
      correo: 'rectorado@ists.edu.ec',
      cedula: '1100000003',
      telefono: '0990000003',
      rol: 'RECTORADO',
      rolEtiqueta: 'Rectorado',
      nombreRol: 'Rectorado',
      departamento: 'Rectorado y Consejo Directivo',
      avatarIniciales: 'RE',
      token: 'token-jwt-3-rectorado'
    },
    VICERRECTORADO: {
      id: '4',
      username: 'vicerrectorado',
      nombres: 'Vicerrectorado Académico',
      apellidos: '',
      nombre: 'Vicerrectorado Académico',
      correo: 'vicerrectorado@ists.edu.ec',
      cedula: '1100000004',
      telefono: '0990000004',
      rol: 'VICERRECTORADO',
      rolEtiqueta: 'Vicerrectorado Académico',
      nombreRol: 'Vicerrectorado Académico',
      departamento: 'Vicerrectorado Académico ISTS',
      avatarIniciales: 'VA',
      token: 'token-jwt-4-vicerrectorado'
    },
    COORDINADOR: {
      id: '5',
      username: 'coordinador',
      nombres: 'Coordinador de Carrera',
      apellidos: '',
      nombre: 'Coordinador de Carrera',
      correo: 'coordinacion@ists.edu.ec',
      cedula: '1100000005',
      telefono: '0990000005',
      rol: 'COORDINADOR',
      rolEtiqueta: 'Coordinación de Carrera',
      nombreRol: 'Coordinador de Carrera',
      departamento: 'Carrera de Desarrollo de Software',
      avatarIniciales: 'CC',
      token: 'token-jwt-5-coordinador'
    },
    BIENESTAR: {
      id: '6',
      username: 'bienestar',
      nombres: 'Bienestar Estudiantil',
      apellidos: '',
      nombre: 'Bienestar Estudiantil',
      correo: 'bienestar@ists.edu.ec',
      cedula: '1100000006',
      telefono: '0990000006',
      rol: 'BIENESTAR',
      rolEtiqueta: 'Unidad de Bienestar Estudiantil',
      nombreRol: 'Bienestar Estudiantil',
      departamento: 'Unidad de Bienestar Estudiantil',
      avatarIniciales: 'BE',
      token: 'token-jwt-6-bienestar'
    },
    POSTULANTE: {
      id: '7',
      username: 'juan',
      nombres: 'Juan',
      apellidos: 'Pérez',
      nombre: 'Juan Pérez',
      correo: 'juan.perez@gmail.com',
      cedula: '1104829101',
      telefono: '0981112233',
      rol: 'POSTULANTE',
      rolEtiqueta: 'Postulante Concursante',
      nombreRol: 'Postulante',
      departamento: 'Postulante Externo',
      avatarIniciales: 'JP',
      token: 'token-jwt-7-juan'
    }
  };

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  private cargarSesionAlmacenada(): UsuarioSesion | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(this.STORAGE_KEY);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.error('Error al recuperar sesión local:', e);
        return null;
      }
    }
    return null;
  }

  // Iniciar sesion con usuario, correo o cedula y contrasenia en el backend Django
  login(identificacion: string, contrasenia: string): Observable<UsuarioSesion> {
    const url = `${this.apiUrl}auth/login/`;
    return this.http.post<UsuarioSesion>(url, { identificacion, contrasenia }).pipe(
      tap(usuario => {
        this.establecerSesion(usuario);
      }),
      catchError(err => {
        const mensaje = err.error?.error || 'Credenciales no válidas. Verifica tus datos de acceso.';
        return throwError(() => new Error(mensaje));
      })
    );
  }

  // Registrar un nuevo postulante en la base de datos MySQL
  registrarPostulante(datos: RegistroPostulanteDto): Observable<UsuarioSesion> {
    const url = `${this.apiUrl}auth/registro/`;
    return this.http.post<UsuarioSesion>(url, datos).pipe(
      tap(usuario => {
        this.establecerSesion(usuario);
      }),
      catchError(err => {
        const mensaje = err.error?.error || 'Error al registrar la cuenta de postulante.';
        return throwError(() => new Error(mensaje));
      })
    );
  }

  // Acceso rapido con un clic para pruebas sincronizado con la BD
  loginDemo(rol: RolUsuario): void {
    const cred = this.credencialesDemo[rol];
    if (cred) {
      this.login(cred.identificacion, cred.contrasenia).subscribe({
        next: (usuario) => {
          const ruta = this.obtenerRutaPorDefecto(usuario.rol);
          this.router.navigate([ruta]);
        },
        error: () => {
          // Fallback con datos de respaldo si el backend no responde
          const fallback = this.cuentasPredefinidas[rol];
          if (fallback) {
            this.establecerSesion(fallback);
            this.router.navigate([this.obtenerRutaPorDefecto(rol)]);
          }
        }
      });
    }
  }

  establecerSesion(usuario: UsuarioSesion): void {
    this.usuarioSignal.set(usuario);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));
    }
  }

  // Cerrar sesion
  logout(): void {
    this.usuarioSignal.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.router.navigate(['/inicio']);
  }

  // Verificar rol permitido
  tieneRol(rolesPermitidos: RolUsuario[]): boolean {
    const usuario = this.usuarioSignal();
    if (!usuario) return false;
    return rolesPermitidos.includes(usuario.rol);
  }

  // Ruta segun el rol para redireccion automatica
  obtenerRutaPorDefecto(rol: RolUsuario): string {
    switch (rol) {
      case 'ADMIN_TECNICO':
        return '/crear-convocatoria';
      case 'TALENTO_HUMANO':
        return '/preseleccion';
      case 'POSTULANTE':
        return '/mi-postulacion';
      case 'RECTORADO':
        return '/ranking';
      case 'VICERRECTORADO':
      case 'BIENESTAR':
      case 'COORDINADOR':
        return '/evaluacion';
      default:
        return '/inicio';
    }
  }
}
