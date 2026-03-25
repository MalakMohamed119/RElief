import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PswNotifications } from './psw-notifications';

describe('PswNotifications', () => {
  let component: PswNotifications;
  let fixture: ComponentFixture<PswNotifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PswNotifications]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PswNotifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
