import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  readonly toast$ = this.toastSubject.asObservable();

  show(message: string, type: ToastType = 'info', durationMs = 3000): void {
    this.toastSubject.next({ message, type });
    if (durationMs > 0) {
      const currentMessage = message;
      setTimeout(() => {
        if (this.toastSubject.value?.message === currentMessage) {
          this.toastSubject.next(null);
        }
      }, durationMs);
    }
  }

  clear(): void {
    this.toastSubject.next(null);
  }
}

