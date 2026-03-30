import { Injectable } from '@angular/core';

type Theme = 'dark' | 'light';
const KEY = 'salem_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  getTheme(): Theme {
    const saved = localStorage.getItem(KEY) as Theme | null;
    return saved ?? 'dark';
  }

  setTheme(theme: Theme) {
    localStorage.setItem(KEY, theme);
    document.documentElement.dataset['theme'] = theme;
  }

  init() {
    this.setTheme(this.getTheme());
  }
}
