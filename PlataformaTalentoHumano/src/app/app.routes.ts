import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio';
import { LoginComponent } from './pages/login/login';
import { PreseleccionComponent } from './pages/preseleccion/preseleccion';
import { PostulacionComponent } from './pages/postulacion/postulacion';
import { MiPostulacionComponent } from './pages/mi-postulacion/mi-postulacion';
import { EvaluacionComponent } from './pages/evaluacion/evaluacion';
import { RankingComponent } from './pages/ranking/ranking';
import { CrearConvocatoriaComponent } from './pages/crear-convocatoria/crear-convocatoria';
import { AdminPostulantesComponent } from './pages/admin-postulantes/admin-postulantes';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

// Rutas de navegacion con proteccion por los 7 roles institucionales
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    component: InicioComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'postulacion',
    component: PostulacionComponent
  },
  {
    path: 'mi-postulacion',
    component: MiPostulacionComponent,
    canActivate: [authGuard]
  },
  {
    path: 'crear-convocatoria',
    component: CrearConvocatoriaComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN_TECNICO', 'TALENTO_HUMANO']
    }
  },
  {
    path: 'preseleccion',
    component: PreseleccionComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['TALENTO_HUMANO', 'VICERRECTORADO', 'COORDINADOR']
    }
  },
  {
    path: 'evaluacion',
    component: EvaluacionComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['RECTORADO', 'VICERRECTORADO', 'BIENESTAR', 'COORDINADOR']
    }
  },
  {
    path: 'ranking',
    component: RankingComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['RECTORADO', 'TALENTO_HUMANO']
    }
  },
  {
    path: 'admin-postulantes',
    component: AdminPostulantesComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN_TECNICO']
    }
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
