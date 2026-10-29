import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConvocatoriasService {
  private http = inject(HttpClient);

  // API en Django para obtener la lista de convocatorias
  private apiUrl = 'http://127.0.0.1:8000/api/convocatorias/';

  // Senal reactiva para mantener las convocatorias en memoria y evitar que se pierdan al navegar
  private vacantesSignal = signal<any[]>([]);
  readonly vacantesActuales = this.vacantesSignal.asReadonly();

  // Para traer la lista de convocatorias desde la API de Django
  obtenerConvocatorias(forzarRecarga = false): Observable<any[]> {
    const url = `${this.apiUrl}?_t=${Date.now()}`;
    return this.http.get<any[]>(url).pipe(
      tap((datos: any) => {
        const lista = Array.isArray(datos) ? datos : (datos?.results || []);
        this.vacantesSignal.set(lista);
      })
    );
  }

  // Para registrar una nueva convocatoria desde el formulario de Talento Humano
  crearConvocatoria(datos: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, datos).pipe(
      tap((nueva: any) => {
        // Se agrega de inmediato a la lista en memoria para verla al instante
        this.vacantesSignal.update(lista => [nueva, ...lista]);
      })
    );
  }

  // Para eliminar una convocatoria de la base de datos de Django
  eliminarConvocatoria(id: string | number): Observable<any> {
    const url = `${this.apiUrl}${id}/`;
    return this.http.delete<any>(url).pipe(
      tap(() => {
        // La removemos de inmediato de la señal reactiva en memoria
        this.vacantesSignal.update(lista => lista.filter(item => String(item.id) !== String(id)));
      })
    );
  }
}
