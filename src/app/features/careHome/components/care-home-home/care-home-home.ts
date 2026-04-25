import { Component, DestroyRef, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Footer } from "../../../../shared/components/footer/footer";
import { Navbar } from "../../../../shared/components/navbar/navbar";
import { OffersService } from '../../../../core/services/offers.service';
import { CreateJobOfferDto } from '../../../../core/models/api.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { first } from 'rxjs/operators';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

interface Service {
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
}

@Component({
  selector: 'app-care-home-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    Footer,
    Navbar
  ],
  templateUrl: './care-home-home.html',
  styleUrls: ['./care-home-home.scss'],
})
export class CareHomeHome implements OnInit {
  readonly destroyRef = inject(DestroyRef);

  requestForm: FormGroup;
  isSubmitting = false;
  editingOfferId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private offersService: OffersService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private notifications: NotificationService
  ) {
    this.requestForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      position: ['', [Validators.required]],
      address: ['', [Validators.required]],
      address2: ['', [Validators.required]],
      city: ['', [Validators.required]],
      province: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      hourlyRate: [0, [Validators.required, Validators.min(10)]],
      shifts: this.fb.array([this.createShiftGroup()])
    });
  }

  ngOnInit(): void {
    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((f) => {
      if (f === 'request-form') {
        setTimeout(() => this.scrollToRequestForm(), 100);
      }
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const offerId = params.get('offerId');
      if (offerId) {
        this.loadOfferForEdit(offerId);
      } else {
        this.editingOfferId = null;
      }
    });
  }

  scrollToRequestForm(): void {
    const el = document.getElementById('request-form');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private loadOfferForEdit(offerId: string): void {
    this.offersService.getOfferById(offerId).pipe(first()).subscribe({
      next: (offer) => {
        if (!offer) return;
        this.editingOfferId = offerId;
        this.requestForm.patchValue({
          title: offer.title ?? offer.Title ?? '',
          description: offer.description ?? offer.Description ?? '',
          position: offer.position ?? offer.Position ?? '',
          address: offer.address ?? offer.Address ?? '',
          address2: offer.address2 ?? offer.Address2 ?? '',
          city: offer.city ?? offer.City ?? '',
          province: offer.province ?? offer.Province ?? '',
          postalCode: offer.postalCode ?? offer.PostalCode ?? '',
          hourlyRate: offer.hourlyRate ?? offer.HourlyRate ?? 0,
        });

        const shifts = offer.shifts ?? offer.Shifts ?? [];
        if (Array.isArray(shifts) && shifts.length) {
          this.shifts.clear();
          for (const s of shifts) {
            const date = s.date ?? s.Date ?? '';
            const startTime = (s.startTime ?? s.StartTime ?? '').toString().slice(0, 5);
            const endTime = (s.endTime ?? s.EndTime ?? '').toString().slice(0, 5);
            this.shifts.push(this.fb.group({
              date,
              startTime: startTime || '08:00',
              endTime: endTime || '16:00',
            }));
          }
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.notifications.show('Failed to load offer for editing.', 'error', 4000);
      }
    });
  }

  private createShiftGroup(): FormGroup {
    return this.fb.group({
      date: ['', Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['16:00', Validators.required]
    });
  }

  get shifts(): FormArray {
    return this.requestForm.get('shifts') as FormArray;
  }

  addShift(): void {
    this.shifts.push(this.createShiftGroup());
  }

  removeShift(index: number): void {
    if (this.shifts.length > 1) {
      this.shifts.removeAt(index);
    }
  }

  /** Format date as "yyyy-MM-dd" for POST /api/Offers */
  private toDateString(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const s = String(value ?? '').trim();
    if (!s) return '';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
  }

  private toTimeHHmmss(value: string): string {
    if (!value) return '08:00:00.0000000';
    const parts = String(value).trim().split(':');
    if (parts.length >= 2) {
      const h = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      return `${h}:${m}:00.0000000`;
    }
    return '08:00:00.0000000';
  }

  submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const v = this.requestForm.value;
    const payload: CreateJobOfferDto = {
      Title: String(v.title ?? ''),
      Description: String(v.description ?? ''),
      Position: String(v.position ?? ''),
      Address: String(v.address ?? ''),
      Address2: String(v.address2 ?? ''),
      City: String(v.city ?? ''),
      Province: String(v.province ?? ''),
      PostalCode: String(v.postalCode ?? ''),
      Latitude: 0,
      Longitude: 0,
      HourlyRate: Number(v.hourlyRate) || 0,
      Shifts: v.shifts.map((s: { date: string | Date; startTime: string; endTime: string }) => ({
        Date: this.toDateString(s.date),
        StartTime: this.toTimeHHmmss(s.startTime),
        EndTime: this.toTimeHHmmss(s.endTime)
      }))
    };
    this.isSubmitting = true;
    const request$ = this.editingOfferId
      ? this.offersService.updateOffer(this.editingOfferId, payload)
      : this.offersService.createOffer(payload);

    request$.pipe(first()).subscribe({
      next: () => {
        const msg = this.editingOfferId ? 'Offer updated successfully.' : 'Request created successfully.';
        this.notifications.show(msg, 'success');
        this.editingOfferId = null;
        this.requestForm.patchValue({
          title: '',
          description: '',
          position: '',
          address: '',
          address2: '',
          city: '',
          province: '',
          postalCode: '',
          hourlyRate: 0
        });
        this.requestForm.markAsUntouched();
        this.requestForm.markAsPristine();
        while (this.shifts.length > 1) this.shifts.removeAt(1);
        this.shifts.at(0).reset({ date: '', startTime: '08:00', endTime: '16:00' });
        this.shifts.at(0).markAsUntouched();
        this.shifts.at(0).markAsPristine();
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Create offer failed', err);
        this.isSubmitting = false;
        this.cdr.markForCheck();
        const status = err?.status;
        if (status === 401) {
          this.notifications.show('Please log in to create an offer.', 'error', 4000);
          this.router.navigate(['/login']);
        } else if (status === 0) {
          this.notifications.show('Cannot reach the server. Check CORS and network, or try again later.', 'error', 5000);
        } else {
          const msg = err?.error?.message || err?.message || 'Request failed. Try again.';
          this.notifications.show(msg, 'error', 5000);
        }
      }
    });
  }

  services: Service[] = [
    {
      icon: 'elderly',
      title: 'Elderly Care',
      description: 'Comprehensive care for the elderly in their homes with the highest quality standards'
    },
    {
      icon: 'medication',
      title: 'Nursing Care',
      description: 'Specialized nursing services by qualified caregivers'
    },
    {
      icon: 'groups',
      title: 'Companionship',
      description: 'Companionship and assistance with daily activities'
    }
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Ahmed Mohamed',
      role: "Client's Son",
      content: 'Excellent service and very professional caregivers. Thank you!',
      rating: 5
    },
    {
      name: 'Sara Ahmed',
      role: "Client's Daughter",
      content: 'Professional team providing excellent care for my mother',
      rating: 4
    }
  ];

  getServiceIcon(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      'elderly': 'fa-user-nurse',
      'medication': 'fa-pills',
      'groups': 'fa-people-group',
      // Add more mappings as needed
    };
    return iconMap[iconName] || 'fa-question-circle'; // Default icon if not found
  }
}
