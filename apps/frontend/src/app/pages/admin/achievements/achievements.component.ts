import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucidePencil, lucidePlus, lucideScale, lucideTrash2, lucideTrophy, lucideTruck, lucideWifi } from '@ng-icons/lucide';
import { AchievementMetric, type Achievement } from '@wastegrab/shared';
import { AchievementService } from '@/services/achievement.service';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardSelectImports } from '@/ui/zard/select/select.imports';
import { ZardTableImports } from '@/ui/zard/table';

type ModalMode = 'add' | 'edit' | null;
type Filter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-achievements-page',
  templateUrl: './achievements.html',
  imports: [

    ReactiveFormsModule,
    AppHeaderComponent,
    TableHeaderComponent,
    ZardButtonComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    EmptyStateComponent,
    NgIcon,
    ...ZardSelectImports,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({ lucideLoaderCircle, lucidePencil, lucidePlus, lucideScale, lucideTrash2, lucideTrophy, lucideTruck, lucideWifi }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAchievementsPage implements OnInit {
  private readonly achievementService = inject(AchievementService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly AchievementMetric = AchievementMetric;
  protected readonly achievements = signal<Achievement[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeFilter = signal<Filter>('all');
  protected readonly modalMode = signal<ModalMode>(null);
  protected readonly editingAchievementId = signal<string | null>(null);
  protected readonly filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  protected readonly metricOptions = [
    { value: AchievementMetric.TOTAL_WEIGHT_KG, label: 'Total Weight' },
    { value: AchievementMetric.COMPLETED_PICKUPS, label: 'Completed Pickups' },
  ];
  protected readonly activeCount = computed(() => this.achievements().filter((achievement) => achievement.isActive).length);
  protected readonly rewardTotal = computed(() => this.achievements().reduce((total, achievement) => total + achievement.rewardPoints, 0));
  protected readonly filteredAchievements = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'active') return this.achievements().filter((achievement) => achievement.isActive);
    if (filter === 'inactive') return this.achievements().filter((achievement) => !achievement.isActive);
    return this.achievements();
  });

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    metric: new FormControl<AchievementMetric>(AchievementMetric.TOTAL_WEIGHT_KG, { nonNullable: true }),
    threshold: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0.01)] }),
    rewardPoints: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadAchievements();
  }

  protected setFilter(filter: Filter): void {
    this.activeFilter.set(filter);
  }

  protected openAdd(): void {
    this.editingAchievementId.set(null);
    this.form.reset({
      title: '',
      description: '',
      metric: AchievementMetric.TOTAL_WEIGHT_KG,
      threshold: 10,
      rewardPoints: 50,
      isActive: true,
    });
    this.modalMode.set('add');
  }

  protected openEdit(achievement: Achievement): void {
    this.editingAchievementId.set(achievement.id);
    this.form.reset({
      title: achievement.title,
      description: achievement.description ?? '',
      metric: achievement.metric,
      threshold: Number(achievement.threshold),
      rewardPoints: achievement.rewardPoints,
      isActive: achievement.isActive,
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingAchievementId.set(null);
  }

  protected saveCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.achievementService.createAchievement(this.formPayload()).subscribe({
      next: (created) => {
        this.achievements.update((list) => [created, ...list]);
        this.closeModal();
      },
    });
  }

  protected saveEdit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingAchievementId();
    if (!id) return;

    this.achievementService.updateAchievement(id, this.formPayload()).subscribe({
      next: (updated) => {
        this.achievements.update((list) => list.map((achievement) => achievement.id === updated.id ? updated : achievement));
        this.closeModal();
      },
    });
  }

  protected deleteAchievement(achievement: Achievement): void {
    this.dialogService.create({
      zTitle: 'Delete Achievement',
      zDescription: `Delete ${achievement.title}? Achievements with unlock history should be set inactive instead.`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.achievementService.deleteAchievement(achievement.id).subscribe({
          next: () => this.achievements.update((list) => list.filter((item) => item.id !== achievement.id)),
        });
      },
    });
  }

  protected metricLabel(metric: AchievementMetric): string {
    return metric === AchievementMetric.COMPLETED_PICKUPS ? 'Completed pickups' : 'Total weight';
  }

  protected thresholdLabel(achievement: Achievement): string {
    return achievement.metric === AchievementMetric.COMPLETED_PICKUPS
      ? `${Number(achievement.threshold).toFixed(0)} pickups`
      : `${Number(achievement.threshold).toFixed(1)} kg`;
  }

  private loadAchievements(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.achievementService.listAchievements().subscribe({
      next: (list) => this.achievements.set(list),
      error: () => {
        this.achievements.set([]);
        this.loadError.set('Unable to load achievements.');
      },
      complete: () => this.isLoading.set(false),
    });
  }

  private formPayload() {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      description: value.description || null,
      metric: value.metric,
      threshold: Number(value.threshold),
      rewardPoints: Number(value.rewardPoints),
      isActive: value.isActive,
    };
  }
}
