import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormControl, FormGroup, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { Project, ProjectAccountOption, ProjectUpsertPayload } from '../../shared/services/ssm-models';
import { ProjectsApiService } from '../../shared/services/projects-api.service';

type ProjectForm = FormGroup<{
  name: FormControl<string>;
  youtube_channel_id: FormControl<string>;
  instagram_id: FormControl<string>;
  tiktok_id: FormControl<string>;
  aliases: FormControl<string>;
  project_start_date: FormControl<string>;
  project_end_date: FormControl<string>;
}>;

type ProjectFilter = 'all' | 'missing-youtube' | 'missing-instagram' | 'missing-tiktok' | 'missing-aliases';

type ProjectFilterDef = {
  key: ProjectFilter;
  label: string;
};

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, ReactiveFormsModule],
  templateUrl: './projects-page.html',
  styleUrl: './projects-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsPageComponent implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly youtubeChannels = signal<ProjectAccountOption[]>([]);
  readonly instagramAccounts = signal<ProjectAccountOption[]>([]);
  readonly tiktokAccounts = signal<ProjectAccountOption[]>([]);

  readonly form: ProjectForm;
  readonly filters: ProjectFilterDef[] = [
    { key: 'all', label: 'Все' },
    { key: 'missing-youtube', label: 'Без YouTube' },
    { key: 'missing-instagram', label: 'Без Instagram' },
    { key: 'missing-tiktok', label: 'Без TikTok' },
    { key: 'missing-aliases', label: 'Без алиасов' },
  ];

  query = '';
  activeFilter: ProjectFilter = 'all';
  editorOpen = false;
  selectedProject = signal<Project | null>(null);
  editingProjectId: number | null = null;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      youtube_channel_id: [''],
      instagram_id: [''],
      tiktok_id: [''],
      aliases: [''],
      project_start_date: [''],
      project_end_date: [''],
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  get isEditing() {
    return this.editingProjectId != null;
  }

  get filteredProjects() {
    const query = this.query.trim().toLowerCase();

    return this.projects().filter((project) => {
      const aliases = this.aliasList(project);
      const matchesQuery = !query || [
        project.id,
        project.name,
        project.utm_name,
        aliases.join(' '),
        project.youtube_channel_id,
        project.instagram_id,
        project.tiktok_id,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);

      if (!matchesQuery) return false;

      if (this.activeFilter === 'missing-youtube') return !project.youtube_channel_id;
      if (this.activeFilter === 'missing-instagram') return !project.instagram_id;
      if (this.activeFilter === 'missing-tiktok') return !project.tiktok_id;
      if (this.activeFilter === 'missing-aliases') return aliases.length === 0;

      return true;
    });
  }

  get linkedYoutubeCount() {
    return this.projects().filter((project) => !!project.youtube_channel_id).length;
  }

  get linkedInstagramCount() {
    return this.projects().filter((project) => !!project.instagram_id).length;
  }

  get linkedTikTokCount() {
    return this.projects().filter((project) => !!project.tiktok_id).length;
  }

  get missingLinksCount() {
    return this.projects().filter((project) => !project.youtube_channel_id || !project.instagram_id || !project.tiktok_id).length;
  }

  get formAliasPreview() {
    return this.form.controls.aliases.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  loadAll(force = false) {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      projects: this.projectsApi.getProjects(force),
      youtubeChannels: this.projectsApi.getYoutubeChannelList(force),
      instagramAccounts: this.projectsApi.getInstagramAccountList(force),
      tiktokAccounts: this.projectsApi.getTikTokAccountList(force),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ projects, youtubeChannels, instagramAccounts, tiktokAccounts }) => {
          this.projects.set([...(projects ?? [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
          this.youtubeChannels.set(youtubeChannels ?? []);
          this.instagramAccounts.set(instagramAccounts ?? []);
          this.tiktokAccounts.set(tiktokAccounts ?? []);
        },
        error: (e: any) => {
          this.error.set(e?.message ?? 'Не удалось загрузить проекты');
        },
      });
  }

  startCreate() {
    this.editingProjectId = null;
    this.selectedProject.set(null);
    this.editorOpen = true;
    this.form.reset({
      name: '',
      youtube_channel_id: '',
      instagram_id: '',
      tiktok_id: '',
      aliases: '',
      project_start_date: '',
      project_end_date: '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  editProject(project: Project) {
    this.editingProjectId = Number(project.id);
    this.selectedProject.set(project);
    this.editorOpen = true;
    this.form.patchValue({
      name: project.name || '',
      youtube_channel_id: project.youtube_channel_id != null ? String(project.youtube_channel_id) : '',
      instagram_id: project.instagram_id != null ? String(project.instagram_id) : '',
      tiktok_id: project.tiktok_id != null ? String(project.tiktok_id) : '',
      aliases: Array.isArray(project.aliaslist) ? project.aliaslist.join(', ') : '',
      project_start_date: project.project_start_date || '',
      project_end_date: project.project_end_date || '',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  cancelEdit() {
    this.startCreate();
    this.editorOpen = false;
  }

  closeEditor() {
    this.startCreate();
    this.editorOpen = false;
  }

  saveProject() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.saving.set(true);

    const request$ = this.isEditing && this.editingProjectId != null
      ? this.projectsApi.updateProject(this.editingProjectId, payload)
      : this.projectsApi.addProject(payload);

    request$
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.toastr.success(this.isEditing ? 'Проект обновлён' : 'Проект добавлен', 'Успех');
          this.loadAll(true);
          this.closeEditor();
        },
        error: (e: any) => {
          const msg = e?.message ?? 'Не удалось сохранить проект';
          this.error.set(msg);
          this.toastr.error(msg, 'Ошибка');
        },
      });
  }

  trackByProject = (_: number, project: Project) => project.id;
  trackByOption = (_: number, option: ProjectAccountOption) => option.id;
  trackByFilter = (_: number, filter: ProjectFilterDef) => filter.key;
  trackByAlias = (_: number, alias: string) => alias;

  projectAliases(project: Project) {
    return Array.isArray(project.aliaslist) && project.aliaslist.length ? project.aliaslist.join(', ') : '—';
  }

  aliasList(project: Project) {
    return Array.isArray(project.aliaslist) ? project.aliaslist.filter(Boolean) : [];
  }

  setFilter(filter: ProjectFilter) {
    this.activeFilter = filter;
  }

  projectTitle(project: Project) {
    return project.name || project.utm_name || `Проект ${project.id}`;
  }

  projectTypeLabel(project: Project) {
    if (project.is_serial === false) return 'Не сериал';
    if (project.is_serial === true) return 'Сериал';
    return 'Тип не указан';
  }

  accountLabel(kind: 'youtube' | 'instagram' | 'tiktok', id: number | null | undefined) {
    if (!id) return 'Не привязан';

    const source =
      kind === 'youtube'
        ? this.youtubeChannels()
        : kind === 'instagram'
          ? this.instagramAccounts()
          : this.tiktokAccounts();

    const option = source.find((item) => Number(item.id) === Number(id));
    return option ? option.name : `ID ${id}`;
  }

  connectionTone(id: number | null | undefined) {
    return id ? 'connected' : 'missing';
  }

  dateRange(project: Project) {
    if (project.project_start_date && project.project_end_date) {
      return `${project.project_start_date} - ${project.project_end_date}`;
    }

    if (project.project_start_date) return `с ${project.project_start_date}`;
    if (project.project_end_date) return `до ${project.project_end_date}`;

    return 'Период не указан';
  }

  projectMetaItems(project: Project | null) {
    if (!project) return [];

    const type = project.is_serial === false ? 'Не сериал' : project.is_serial === true ? 'Сериал' : null;

    return [
      { label: 'UTM', value: project.utm_name },
      { label: 'Тип', value: type },
      { label: 'Возраст', value: project.age },
      { label: 'Категория', value: project.category },
      { label: 'Пол', value: project.gender },
      { label: 'Жанр', value: project.genre },
      { label: 'Язык', value: project.lang },
    ].filter((item): item is { label: string; value: string } => !!item.value);
  }

  private buildPayload(): ProjectUpsertPayload {
    const value = this.form.getRawValue();
    const toNullableNumber = (raw: string) => {
      const normalized = raw.trim();
      return normalized ? Number(normalized) : null;
    };

    return {
      ProjectName: value.name.trim(),
      YTChannelID: toNullableNumber(value.youtube_channel_id),
      InstagramId: toNullableNumber(value.instagram_id),
      TikTokId: toNullableNumber(value.tiktok_id),
      aliaslist: value.aliases
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      ProjectStartDate: value.project_start_date.trim() || null,
      ProjectEndDate: value.project_end_date.trim() || null,
    };
  }
}
