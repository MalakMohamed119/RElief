import { Component, OnDestroy, NgZone } from '@angular/core';
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

  constructor(private notifications: NotificationService, private zone: NgZone) {
    this.sub = this.notifications.toast$.subscribe({
      next: (t) => {
        // Run outside Angular zone to avoid change detection issues
        this.zone.runOutsideAngular(() => {
          setTimeout(() => {
            this.zone.run(() => {
              this.toast = t;
            });
          });
        });
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

