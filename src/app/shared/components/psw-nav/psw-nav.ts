import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ToastComponent } from '../toast/toast';

@Component({
  selector: 'app-psw-nav',
  standalone: true, 
  imports: [CommonModule, AsyncPipe, RouterLink, RouterLinkActive, ToastComponent], 
  templateUrl: './psw-nav.html',
  styleUrls: ['./psw-nav.scss'],
})
export class PswNav {
  userRole: string = 'psw';
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly userProfile$ = this.authService.userProfile$;

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
