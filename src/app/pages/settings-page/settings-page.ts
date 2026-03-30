import { Component } from '@angular/core';
import { ThemeService } from '../../shared/services/theme';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPageComponent {
  constructor(public theme: ThemeService) {}

  get current() {
    return this.theme.getTheme();
  }

  set(theme: 'dark' | 'light') {
    this.theme.setTheme(theme);
  }
}
