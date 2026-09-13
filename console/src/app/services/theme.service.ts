import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Color {
  name: string;
  hex: string;
  rgb: string;
  contrastColor: string;
}

@Injectable()
export class ThemeService {
  private _darkTheme: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public isDarkTheme: Observable<boolean> = this._darkTheme.asObservable();
  public loading: boolean = false;

  constructor() {
    const theme = localStorage.getItem('cp-theme');
    this.setDarkTheme(
      theme === 'dark' ||
        theme === 'dark-theme' ||
        ((!theme || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches),
    );
  }

  setDarkTheme(isDarkTheme: boolean): void {
    this._darkTheme.next(isDarkTheme);
  }
}
