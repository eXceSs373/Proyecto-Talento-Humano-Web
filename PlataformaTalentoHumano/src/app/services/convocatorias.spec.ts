import { TestBed } from '@angular/core/testing';
import { Convocatorias } from './convocatorias';

describe('Convocatorias', () => {
  let service: Convocatorias;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Convocatorias);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
