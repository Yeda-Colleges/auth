import { supportedLanguages } from '../utils/language';
import { Observable, ReplaySubject } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LanguagesService {
  private supportedSubject$ = new ReplaySubject<string[]>(1);
  public supported$: Observable<string[]> = this.supportedSubject$.asObservable();
  private allowedSubject$ = new ReplaySubject<string[]>(1);
  public allowed$: Observable<string[]> = this.allowedSubject$.asObservable();
  public notAllowed$: Observable<string[]> = this.allowed$.pipe(
    withLatestFrom(this.supported$),
    map(([allowed, supported]) => {
      return supported.filter((s) => !allowed.includes(s));
    }),
  );
  public restricted$: Observable<boolean> = this.notAllowed$.pipe(
    map((notallowed) => {
      return notallowed.length > 0;
    }),
  );

  constructor() {
    // UI translations are bundled locally; personal settings need no Admin API.
    this.supportedSubject$.next(supportedLanguages);
    this.allowedSubject$.next(supportedLanguages);
  }

  public newAllowed(languages: string[]) {
    this.allowedSubject$.next(languages);
  }

  public isNotAllowed(language: string): Observable<boolean> {
    return this.notAllowed$.pipe(map((notAllowed) => notAllowed.includes(language)));
  }
}
