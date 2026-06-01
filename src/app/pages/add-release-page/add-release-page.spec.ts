import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { ReleasesApiService } from '../../shared/services/releases-api.service';
import { AddReleasePageComponent } from './add-release-page';

describe('AddReleasePageComponent', () => {
  let component: AddReleasePageComponent;
  let fixture: ComponentFixture<AddReleasePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddReleasePageComponent],
      providers: [
        { provide: ProjectsApiService, useValue: { getProjects: () => of([]), getProjectInfo: () => of([]) } },
        { provide: ReleasesApiService, useValue: { addAutoRelease: () => of('ok') } },
        { provide: ToastrService, useValue: { success: () => undefined, error: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddReleasePageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
