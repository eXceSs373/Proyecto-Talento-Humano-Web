import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener todas las vacantes
  getVacantes(): Observable<any> {
    return this.http.get(`${this.baseUrl}vacantes/`);
  }

  // Registrar un nuevo candidato
  postularCandidato(datosCandidato: any): Observable<any> {
    return this.http.post(`${this.baseUrl}candidatos/`, datosCandidato);
  }
}
