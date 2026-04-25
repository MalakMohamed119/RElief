import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, ToastMessage } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrls: ['./toast.scss'],
})
export class ToastComponent implements OnDestroy {
  toast: ToastMessage | null = null;
  private sub: Subscription;

  constructor(private notifications: NotificationService) {
    this.sub = this.notifications.toast$.subscribe({
      next: (t) => {
        this.toast = t;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onClose(): void {
    this.notifications.clear();
  }
}
