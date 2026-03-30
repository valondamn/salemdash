import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TabsComponent, TabDef } from '../../shared/ui/tabs/tabs';

import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, TabsComponent],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayoutComponent {
  tabs: TabDef[] = [
    { label: 'Dashboard', to: '/dashboard', icon: '📊' },
    { label: 'Stats', to: '/stats', icon: '📈' },
    { label: 'Settings', to: '/settings', icon: '⚙️' },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

}



