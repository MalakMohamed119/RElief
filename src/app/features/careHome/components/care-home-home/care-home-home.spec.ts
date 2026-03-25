import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareHomeHome } from './care-home-home';

describe('CareHomeHome', () => {
  let component: CareHomeHome;
  let fixture: ComponentFixture<CareHomeHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareHomeHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CareHomeHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
