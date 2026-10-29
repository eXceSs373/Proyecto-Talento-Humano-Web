import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, RolUsuario } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  isDarkMode = false;
  cargando = false;
  pestanaActual: 'login' | 'registro' = 'login';
  mensajeError: string | null = null;
  mensajeExito: string | null = null;

  // Formulario para iniciar sesion
  formularioLogin = {
    identificacion: '',
    contrasenia: '',
    recordarme: true
  };

  // Formulario para registrar un nuevo postulante
  formularioRegistro = {
    nombres: '',
    apellidos: '',
    cedula: '',
    correo: '',
    telefono: '',
    contrasenia: '',
    confirmarContrasenia: '',
    aceptaTerminos: false
  };

  private returnUrl: string = '/inicio';

  constructor(
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      this.isDarkMode = document.body.classList.contains('dark-theme');
    }

    // Guardar la ruta a la que queria entrar
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
    });

    // Si ya inicio sesion redirigir a su panel
    if (this.authService.estaAutenticado()) {
      const usuario = this.authService.usuarioActual();
      if (usuario) {
        this.router.navigate([this.authService.obtenerRutaPorDefecto(usuario.rol)]);
      }
    }
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

  // Para validar e iniciar sesion contra la BD MySQL
  iniciarSesion(): void {
    this.mensajeError = null;

    if (!this.formularioLogin.identificacion.trim()) {
      this.mensajeError = 'Por favor ingresa tu cédula, usuario o correo.';
      return;
    }

    if (!this.formularioLogin.contrasenia.trim()) {
      this.mensajeError = 'Por favor ingresa tu contraseña de acceso.';
      return;
    }

    this.cargando = true;
    this.cdr.detectChanges();

    this.authService.login(
      this.formularioLogin.identificacion.trim(),
      this.formularioLogin.contrasenia.trim()
    ).subscribe({
      next: (usuario) => {
        this.cargando = false;
        const destino = this.returnUrl !== '/inicio' && this.returnUrl !== '/login'
          ? this.returnUrl
          : (usuario ? this.authService.obtenerRutaPorDefecto(usuario.rol) : '/inicio');
        this.cdr.detectChanges();
        this.router.navigate([destino]);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.message || 'Credenciales no válidas. Revisa tus datos o usa las cuentas de prueba.';
        this.cdr.detectChanges();
      }
    });
  }

  // Botones rapidos para probar los roles con la BD
  accesoDemo(rol: RolUsuario): void {
    this.cargando = true;
    this.cdr.detectChanges();
    this.authService.loginDemo(rol);
  }

  // Para registrar un nuevo postulante en la base de datos MySQL
  registrarPostulante(): void {
    this.mensajeError = null;
    this.mensajeExito = null;

    if (!this.formularioRegistro.nombres.trim() || !this.formularioRegistro.apellidos.trim() || !this.formularioRegistro.cedula.trim() || !this.formularioRegistro.correo.trim()) {
      this.mensajeError = 'Por favor completa todos los campos obligatorios del registro.';
      return;
    }

    if (this.formularioRegistro.cedula.trim().length !== 10) {
      this.mensajeError = 'La cédula debe contener exactamente 10 dígitos numéricos.';
      return;
    }

    if (this.formularioRegistro.contrasenia.length < 6) {
      this.mensajeError = 'La contraseña debe contener al menos 6 caracteres.';
      return;
    }

    if (this.formularioRegistro.contrasenia !== this.formularioRegistro.confirmarContrasenia) {
      this.mensajeError = 'Las contraseñas ingresadas no coinciden.';
      return;
    }

    if (!this.formularioRegistro.aceptaTerminos) {
      this.mensajeError = 'Debes autorizar el tratamiento de datos para continuar.';
      return;
    }

    this.cargando = true;
    this.cdr.detectChanges();

    this.authService.registrarPostulante({
      nombres: this.formularioRegistro.nombres.trim(),
      apellidos: this.formularioRegistro.apellidos.trim(),
      cedula: this.formularioRegistro.cedula.trim(),
      correo: this.formularioRegistro.correo.trim(),
      telefono: this.formularioRegistro.telefono.trim(),
      contrasenia: this.formularioRegistro.contrasenia.trim()
    }).subscribe({
      next: (usuario) => {
        this.cargando = false;
        this.mensajeExito = `¡Cuenta de ${usuario.nombre} creada exitosamente en la base de datos! Iniciando tu sesión...`;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.router.navigate(['/mi-postulacion']);
        }, 1200);
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err.message || 'Error al registrar la cuenta. Verifica que la cédula y correo no estén registrados.';
        this.cdr.detectChanges();
      }
    });
  }
}

