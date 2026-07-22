import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  AutoReleaseAddPayload,
  Project,
  EpisodeInfo,
} from '../../shared/services/ssm-models';
import { ProjectsApiService } from '../../shared/services/projects-api.service';
import { ReleasesApiService } from '../../shared/services/releases-api.service';
import { resolveApiErrorMessage } from '../../shared/utils/http-error';

type AddReleaseForm = FormGroup<{
  project_id: FormControl<string>;
  season: FormControl<number>;
  video_query: FormControl<string>;
  selected_video_id: FormControl<string>;
}>;

@Component({
  selector: 'app-add-release-page',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './add-release-page.html',
  styleUrl: './add-release-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddReleasePageComponent implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly releasesApi = inject(ReleasesApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loadingProjects = signal(false);
  readonly loadingVideos = signal(false);
  readonly submitting = signal(false);

  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly projects = signal<Project[]>([]);
  readonly videos = signal<EpisodeInfo[]>([]);

  readonly form: AddReleaseForm;

  constructor() {
    this.form = this.fb.group({
      project_id: ['', Validators.required],
      season: [1, [Validators.required, Validators.min(1)]],
      video_query: [''],
      selected_video_id: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.form.get('project_id')?.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.success.set(null);
      });

    this.loadProjects();
    this.loadAllVideos();
  }

  get selectedProject(): Project | null {
    const projectId = Number(this.form.controls.project_id.value);
    return this.projects().find((project) => Number(project.id) === projectId) ?? null;
  }

  get selectedProjectLabel(): string {
    return this.selectedProject ? this.getProjectLabel(this.selectedProject) : 'Проект не выбран';
  }

  get canSubmit(): boolean {
    return !this.submitting() && !this.loadingProjects() && !this.loadingVideos() && !!this.selectedVideo;
  }

  get filteredVideos(): EpisodeInfo[] {
    const query = this.form.controls.video_query.value.trim().toLowerCase();
    const videos = this.videos();

    if (!query) {
      return videos;
    }

    return videos.filter((video) => {
      const haystack = [
        this.getVideoName(video),
        this.getVideoChannel(video),
        this.getVideoId(video),
        this.getVideoDate(video),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  get selectedVideo(): EpisodeInfo | null {
    const selectedId = this.form.controls.selected_video_id.value.trim();
    if (!selectedId) return null;

    return this.videos().find((video) => this.getVideoId(video) === selectedId) ?? null;
  }

  loadProjects() {
    this.loadingProjects.set(true);
    this.error.set(null);

    this.projectsApi.getProjects().subscribe({
      next: (list) => {
        this.projects.set(list ?? []);

        const projects = this.projects();
        if (projects.length && !this.form.controls.project_id.value) {
          this.form.patchValue({ project_id: String(projects[0].id) });
        }
      },
      error: (e: any) => {
        this.error.set(resolveApiErrorMessage(e, 'Не удалось загрузить проекты'));
      },
      complete: () => {
        this.loadingProjects.set(false);
      },
    });
  }

  selectVideo(video: EpisodeInfo) {
    const youtubeId = this.getVideoId(video);
    const season = this.getVideoSeason(video);

    if (!youtubeId) {
      this.toastr.error('У выбранного видео нет YouTube ID', 'Ошибка');
      return;
    }

    this.form.patchValue({
      selected_video_id: youtubeId,
      ...(season ? { season } : {}),
    });
  }

  isSelected(video: EpisodeInfo) {
    return this.getVideoId(video) === this.form.controls.selected_video_id.value;
  }

  submit() {
    this.error.set(null);
    this.success.set(null);

    if (this.form.invalid || !this.selectedVideo) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const selectedVideo = this.selectedVideo;
    const youtubeId = this.getVideoId(selectedVideo);
    const episodeName = this.getVideoName(selectedVideo);

    if (!youtubeId) {
      const msg = 'У выбранного видео не хватает YouTube ID';
      this.error.set(msg);
      this.toastr.error(msg, 'Ошибка');
      return;
    }

    const payload: AutoReleaseAddPayload = {
      youtube_id: youtubeId,
      project_id: Number(formValue.project_id),
      season: Number(formValue.season),
    };

    this.submitting.set(true);

    this.releasesApi.updateAutoRelease(payload).pipe(
      timeout(15000),
      finalize(() => {
        this.submitting.set(false);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.success.set(`Релиз обновлён: "${episodeName}"`);
        this.toastr.success('Релиз успешно сохранён', 'Успех');

        this.form.patchValue({
          video_query: '',
          selected_video_id: '',
        });

        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
      error: (e: any) => {
        const msg = resolveApiErrorMessage(e, 'Не удалось сохранить релиз');
        this.error.set(msg);
        this.toastr.error(msg, 'Ошибка');
      },
    });
  }

  trackByVideo = (index: number, video: EpisodeInfo) => this.getVideoId(video) || video.id || index;

  getProjectLabel(project: Project) {
    return project.name || project.utm_name || `Проект ${project.id}`;
  }

  getVideoName(video: EpisodeInfo): string {
    return String(video.episode_name || video['EpisodesName'] || 'Видео без названия').trim();
  }

  getVideoId(video: EpisodeInfo): string {
    return String(video.youtube_id || video['YouTubeID'] || '').trim();
  }

  getVideoChannel(video: EpisodeInfo): string {
    return String(video.youtube_channel || '').trim();
  }

  getVideoDate(video: EpisodeInfo): string {
    return String(
      video.youtube_release_date || video.release_date || video['YouTubeReleaseDate'] || video['ReleaseDate'] || ''
    )
      .slice(0, 10)
      .trim();
  }

  getVideoSeason(video: EpisodeInfo): number | null {
    const season = Number(video.season ?? video['Season']);
    return Number.isFinite(season) && season > 0 ? season : null;
  }

  formatDate(date: string) {
    return date || '—';
  }

  private loadAllVideos() {
    this.videos.set([]);
    this.form.patchValue({
      video_query: '',
      selected_video_id: '',
    });

    this.loadingVideos.set(true);
    this.error.set(null);

    this.projectsApi.getProjectInfo(0).subscribe({
      next: (rows) => {
        this.videos.set([...(rows ?? [])].sort((a, b) => this.getVideoDate(b).localeCompare(this.getVideoDate(a))));
      },
      error: (e: any) => {
        this.error.set(resolveApiErrorMessage(e, 'Не удалось загрузить общий список видео'));
      },
      complete: () => {
        this.loadingVideos.set(false);
      },
    });
  }
}
