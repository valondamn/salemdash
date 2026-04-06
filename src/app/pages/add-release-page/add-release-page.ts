import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { ReactiveFormsModule, Validators, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

import { SsmApiService, Project, AutoReleaseAddPayload } from '../../shared/services/ssm-api.service';
import { finalize, timeout } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-add-release-page',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './add-release-page.html',
  styleUrl: './add-release-page.scss',
})
export class AddReleasePageComponent implements OnInit {
  loadingProjects = false;
  submitting = false;

  error: string | null = null;
  success: string | null = null;

  projects: Project[] = [];

  form: UntypedFormGroup;

  constructor(private api: SsmApiService, private fb: UntypedFormBuilder,  private toastr: ToastrService) {
    this.form = this.fb.group({
      release_date: ['', Validators.required],
      project_id: ['', Validators.required],
      season: [1, [Validators.required, Validators.min(1)]],
      episodes_name: ['', [Validators.required, Validators.minLength(2)]],
      youtube_id: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects() {
    this.loadingProjects = true;
    this.error = null;

    this.api.getProjects().subscribe({
      next: (list) => {
        this.projects = list ?? [];

        // дефолтный project_id
        if (this.projects.length && !this.form.value.project_id) {
          this.form.patchValue({ project_id: String(this.projects[0].id) });
        }
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Failed to load projects';
      },
      complete: () => {
        this.loadingProjects = false;
      },
    });
  }

  submit() {
    this.error = null;
    this.success = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const payload = {
      release_date: String(v.release_date).slice(0, 10),
      project_id: Number(v.project_id),
      season: Number(v.season),
      episodes_name: String(v.episodes_name).trim(),
      youtube_id: String(v.youtube_id).trim(),
    };

    this.submitting = true;

    this.api.addAutoRelease(payload).pipe(
      // если сервер подвисает — не зависаем вместе с ним
      timeout(15000),
      finalize(() => {
        this.submitting = false;
      })
    ).subscribe({
      next: (res) => {
        this.toastr.success('Запись успешно добавлена', 'Success');
        console.log('server response:', res); // тут будет текст

        this.form.patchValue({
          release_date: '',
          episodes_name: '',
          youtube_id: '',
        });

        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
      error: (e: any) => {
        const msg = e?.message || 'Failed to save';
        this.toastr.error(msg, 'Error');
      },
    });
  }
}
