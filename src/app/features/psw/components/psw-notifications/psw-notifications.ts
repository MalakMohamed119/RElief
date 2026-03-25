import { Component } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Footer } from "../../../../shared/components/footer/footer";
import { PswNav } from "../../../../shared/components/psw-nav/psw-nav";

@Component({
  selector: 'app-psw-notifications',
  standalone: true,
  imports: [CommonModule, Footer, PswNav, TitleCasePipe],
  templateUrl: './psw-notifications.html',
  styleUrls: ['./psw-notifications.scss'],
})
export class PswNotifications {
  notifications = [
    {
      id: '1',
      requestTime: new Date(Date.now() - 3600000), // 1 hour ago
      startTime: new Date(new Date().setHours(9, 0, 0, 0)), // Today 9:00 AM
      endTime: new Date(new Date().setHours(17, 0, 0, 0)),   // Today 5:00 PM
      status: 'accepted',
      message: 'Your application for Senior Care position at Al Noor Care Home has been accepted',
      careHome: 'Al Noor Care Home',
      position: 'Senior Caregiver',
      date: new Date()
    },
    {
      id: '2',
      requestTime: new Date(Date.now() - 86400000), // 1 day ago
      startTime: new Date(Date.now() - 86400000 + (14 * 60 * 60 * 1000)), // Yesterday 2:00 PM
      endTime: new Date(Date.now() - 86400000 + (22 * 60 * 60 * 1000)),   // Yesterday 10:00 PM
      status: 'rejected',
      message: 'Your application for Night Shift Nurse at Al Amal Hospital has been declined',
      careHome: 'Al Amal Hospital',
      position: 'Night Shift Nurse',
      date: new Date(Date.now() - 86400000)
    },
    {
      id: '3',
      requestTime: new Date(Date.now() - 172800000), // 2 days ago
      startTime: new Date(Date.now() - 172800000 + (10 * 60 * 60 * 1000)), // 2 days ago 10:00 AM
      endTime: new Date(Date.now() - 172800000 + (18 * 60 * 60 * 1000)),   // 2 days ago 6:00 PM
      status: 'accepted',
      message: 'Your application for Part-time Caregiver at Dar Al Rahma has been approved',
      careHome: 'Dar Al Rahma',
      position: 'Part-time Caregiver',
      date: new Date(Date.now() - 172800000)
    }
  ];

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `${interval} years ago`;
    if (interval === 1) return '1 year ago';
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} months ago`;
    if (interval === 1) return '1 month ago';
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} days ago`;
    if (interval === 1) return '1 day ago';
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} hours ago`;
    if (interval === 1) return '1 hour ago';
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} minutes ago`;
    if (interval === 1) return '1 minute ago';
    
    return 'just now';
  }

  acceptRequest(id: string) {
    console.log('Accepting request:', id);
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.status = 'accepted';
    }
  }

  rejectRequest(id: string) {
    console.log('Rejecting request:', id);
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.status = 'rejected';
    }
  }

  viewProfile(id: string) {
    console.log('Viewing profile for:', id);
    // Add navigation logic here
  }
}
