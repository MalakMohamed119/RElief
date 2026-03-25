import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PswProfile } from './psw-profile';

describe('PswProfile', () => {
  let component: PswProfile;
  let fixture: ComponentFixture<PswProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PswProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PswProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
