import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MRDetailsPage } from './mrdetails-page';

describe('MRDetailsPage', () => {
  let component: MRDetailsPage;
  let fixture: ComponentFixture<MRDetailsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MRDetailsPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MRDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
