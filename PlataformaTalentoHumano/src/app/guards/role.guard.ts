import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, RolUsuario } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const rolesPermitidos = (route.data?.['roles'] as RolUsuario[]) || [];
  if (rolesPermitidos.length === 0 || authService.tieneRol(rolesPermitidos)) {
    return true;
  }

  // Si no tiene permiso redirigir a su modulo
  const usuario = authService.usuarioActual();
  const rutaPorDefecto = usuario ? authService.obtenerRutaPorDefecto(usuario.rol) : '/inicio';
  return router.createUrlTree([rutaPorDefecto]);
};
