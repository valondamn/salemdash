import { Routes } from '@angular/router';

import { AuthLayoutComponent } from './layouts/auth-layout/auth-layout';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

import { LoginPageComponent } from './pages/login-page/login-page';
import { DashboardPageComponent } from './pages/dashboard-page/dashboard-page';
import { StatsPageComponent } from './pages/stats-page/stats-page';
import { SettingsPageComponent } from './pages/settings-page/settings-page';
import { AddReleasePageComponent } from './pages/add-release-page/add-release-page';
import { authGuard } from './shared/guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [{ path: '', component: LoginPageComponent }],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardPageComponent },
      { path: 'stats', component: StatsPageComponent },
      { path: 'settings', component: SettingsPageComponent },
      { path: 'add-release', component: AddReleasePageComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
