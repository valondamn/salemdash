import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, Validators, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  SsmApiService,
  Project,
  EpisodeInfo,
  AutoReleaseAddPayload,
} from '../../shared/services/ssm-api.service';

@Component({
  selector: 'app-add-release-page',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './add-release-page.html',
  styleUrl: './add-release-page.scss',
})
export class AddReleasePageComponent implements OnInit {
  loadingProjects = false;
  loadingVideos = false;
  submitting = false;

  error: string | null = null;
  success: string | null = null;

  projects: Project[] = [];
  videos: EpisodeInfo[] = [];

  form: UntypedFormGroup;

  constructor(
    private api: SsmApiService,
    private fb: UntypedFormBuilder,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      project_id: ['', Validators.required],
      season: [1, [Validators.required, Validators.min(1)]],
      video_query: [''],
      selected_video_id: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.form.get('project_id')?.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => {
        this.success = null;
        this.loadVideosForSelectedProject();
      });

    this.loadProjects();
  }

  get filteredVideos(): EpisodeInfo[] {
    const query = String(this.form.value.video_query ?? '').trim().toLowerCase();

    if (!query) {
      return this.videos;
    }

    return this.videos.filter((video) => {
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
    const selectedId = String(this.form.value.selected_video_id ?? '').trim();
    if (!selectedId) return null;

    return this.videos.find((video) => this.getVideoId(video) === selectedId) ?? null;
  }

  loadProjects() {
    this.loadingProjects = true;
    this.error = null;

    this.api.getProjects().subscribe({
      next: (list) => {
        this.projects = list ?? [];

        if (this.projects.length && !this.form.value.project_id) {
          this.form.patchValue({ project_id: String(this.projects[0].id) });
        }

        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить проекты';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loadingProjects = false;
        this.cdr.detectChanges();
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
    return this.getVideoId(video) === String(this.form.value.selected_video_id ?? '');
  }

  submit() {
    this.error = null;
    this.success = null;

    if (this.form.invalid || !this.selectedVideo) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const selectedVideo = this.selectedVideo;
    const releaseDate = this.getVideoDate(selectedVideo);
    const youtubeId = this.getVideoId(selectedVideo);
    const episodeName = this.getVideoName(selectedVideo);

    if (!releaseDate || !youtubeId || !episodeName) {
      const msg = 'У выбранного видео не хватает данных из API';
      this.error = msg;
      this.toastr.error(msg, 'Ошибка');
      return;
    }

    const payload: AutoReleaseAddPayload = {
      release_date: releaseDate,
      project_id: Number(formValue.project_id),
      season: Number(formValue.season),
      episodes_name: episodeName,
      youtube_id: youtubeId,
    };

    this.submitting = true;

    this.api.addAutoRelease(payload).pipe(
      timeout(15000),
      finalize(() => {
        this.submitting = false;
      })
    ).subscribe({
      next: () => {
        this.success = `Релиз обновлён: "${episodeName}"`;
        this.toastr.success('Релиз успешно сохранён', 'Успех');

        this.form.patchValue({
          video_query: '',
          selected_video_id: '',
        });

        this.form.markAsPristine();
        this.form.markAsUntouched();
      },
      error: (e: any) => {
        const msg = e?.message || 'Не удалось сохранить релиз';
        this.error = msg;
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

  private loadVideosForSelectedProject() {
    const projectId = Number(this.form.value.project_id);

    this.videos = [];
    this.form.patchValue({
      video_query: '',
      selected_video_id: '',
    });

    if (!projectId) {
      return;
    }

    this.loadingVideos = true;
    this.error = null;
    this.cdr.detectChanges();

    this.api.getProjectInfo(projectId).subscribe({
      next: (rows) => {
        this.videos = [...(rows ?? [])].sort((a, b) => this.getVideoDate(b).localeCompare(this.getVideoDate(a)));
        this.cdr.detectChanges();
      },
      error: (e: any) => {
        this.error = e?.message ?? 'Не удалось загрузить видео';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.loadingVideos = false;
        this.cdr.detectChanges();
      },
    });
  }
}
