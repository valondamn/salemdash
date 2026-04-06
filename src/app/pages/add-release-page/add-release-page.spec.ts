import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddReleasePage } from './add-release-page';

describe('AddReleasePage', () => {
  let component: AddReleasePage;
  let fixture: ComponentFixture<AddReleasePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddReleasePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddReleasePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
