import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PswNav } from './psw-nav';

describe('PswNav', () => {
  let component: PswNav;
  let fixture: ComponentFixture<PswNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PswNav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PswNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
