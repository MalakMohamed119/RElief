import { Component, DestroyRef, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Footer } from "../../../../shared/components/footer/footer";
import { Navbar } from "../../../../shared/components/navbar/navbar";
import { OffersService } from '../../../../core/services/offers.service';
import { CreateJobOfferDto } from '../../../../core/models/api.models';
import { NotificationService } from '../../../../core/services/notification.service';
import { first } from 'rxjs/operators';
import * as L from 'leaflet';

// Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

function addressOrLocationValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const g = group as FormGroup;
    const address = (g.get('address')?.value ?? '').trim();
    const lat = Number(g.get('latitude')?.value);
    const lng = Number(g.get('longitude')?.value);
    const hasAddress = address.length > 0;
    const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng) && (lat !== 0 || lng !== 0);
    return hasAddress || hasLocation ? null : { addressOrLocationRequired: true };
  };
}

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
export class CareHomeHome implements OnInit, AfterViewInit {
  readonly destroyRef = inject(DestroyRef);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  requestForm: FormGroup;
  isSubmitting = false;
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  mapReady = false;
  addressOrLocationError = false;
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
      address: [''],
      latitude: [0],
      longitude: [0],
      hourlyRate: [0, [Validators.required, Validators.min(10)]],
      shifts: this.fb.array([this.createShiftGroup()])
    }, { validators: addressOrLocationValidator() });
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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 0);
  }

  scrollToRequestForm(): void {
    const el = document.getElementById('request-form');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private initMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    const defaultCenter: L.LatLngTuple = [30.0444, 31.2357]; // Cairo
    this.map = L.map(this.mapContainer.nativeElement).setView(defaultCenter, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => this.onMapClick(e.latlng));
    this.mapReady = true;
    // cdr.markForCheck(); - Angular handles automatically after setTimeout
  }

  private onMapClick(latlng: L.LatLng): void {
    const lat = latlng.lat;
    const lng = latlng.lng;
    this.requestForm.patchValue({ latitude: lat, longitude: lng });
    if (this.marker) this.marker.setLatLng(latlng);
    else if (this.map) {
      this.marker = L.marker(latlng).addTo(this.map);
    }
    this.reverseGeocode(lat, lng);
    this.addressOrLocationError = false;
    this.cdr.markForCheck();
  }

  private reverseGeocode(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(res => res.json())
      .then((data: { display_name?: string }) => {
        const addr = data?.display_name ?? '';
        if (addr) this.requestForm.patchValue({ address: addr });
        this.cdr.markForCheck();
      })
      .catch(() => this.cdr.markForCheck());
  }

  private loadOfferForEdit(offerId: string): void {
    this.offersService.getOfferById(offerId).pipe(first()).subscribe({
      next: (offer) => {
        if (!offer) return;
        this.editingOfferId = offerId;
        this.requestForm.patchValue({
          title: offer.title ?? offer.Title ?? '',
          description: offer.description ?? offer.Description ?? '',
          address: offer.address ?? offer.Address ?? '',
          latitude: offer.latitude ?? offer.Latitude ?? 0,
          longitude: offer.longitude ?? offer.Longitude ?? 0,
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

        const lat = this.requestForm.get('latitude')?.value;
        const lng = this.requestForm.get('longitude')?.value;
        if (this.map && lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng)) {
          const latlng = L.latLng(lat, lng);
          if (this.marker) {
            this.marker.setLatLng(latlng);
          } else {
            this.marker = L.marker(latlng).addTo(this.map);
          }
          this.map.setView(latlng, 13);
        }

        this.addressOrLocationError = false;
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
    if (!value) return '08:00:00';
    const parts = String(value).trim().split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    return '08:00:00';
  }

  submitRequest(): void {
    this.addressOrLocationError = this.requestForm.hasError('addressOrLocationRequired');
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const v = this.requestForm.value;
    const payload: CreateJobOfferDto = {
      title: String(v.title ?? ''),
      description: String(v.description ?? ''),
      address: String(v.address ?? ''),
      latitude: Number(v.latitude) || 0,
      longitude: Number(v.longitude) || 0,
      hourlyRate: Number(v.hourlyRate) || 0,
      shifts: v.shifts.map((s: { date: string | Date; startTime: string; endTime: string }) => ({
        date: this.toDateString(s.date),
        startTime: this.toTimeHHmmss(s.startTime),
        endTime: this.toTimeHHmmss(s.endTime)
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
          address: '',
          latitude: 0,
          longitude: 0,
          hourlyRate: 0
        });
        if (this.marker && this.map) {
          this.map.removeLayer(this.marker);
          this.marker = null;
        }
        while (this.shifts.length > 1) this.shifts.removeAt(1);
        this.shifts.at(0).reset({ date: '', startTime: '08:00', endTime: '16:00' });
        this.isSubmitting = false;
        this.addressOrLocationError = false;
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