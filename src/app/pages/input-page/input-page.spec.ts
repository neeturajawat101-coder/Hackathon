import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { InputPageComponent } from './input-page';

describe('InputPageComponent', () => {
  let component: InputPageComponent;
  let fixture: ComponentFixture<InputPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InputPageComponent],
      imports: [FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InputPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
