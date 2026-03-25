import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastComponent } from '../toast/toast';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: true
})
export class Navbar {
  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  userRole: string = this.authService.getUserRole() || 'carehome';

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleTheme(): void {
    this.themeService.toggleDarkMode();
  }
}
