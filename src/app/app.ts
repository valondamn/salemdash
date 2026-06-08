import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './shared/services/theme';
import { AuthService } from './shared/services/auth';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  standalone: true,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('SalemDashboard');

  constructor(private theme: ThemeService, private auth: AuthService) {
    this.theme.init();
    void this.auth.restoreSession();
  }
}
