import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarCheck, lucideCoins, lucideLoaderCircle, lucideScale, lucideTrophy, lucideTruck, lucideWifi } from '@ng-icons/lucide';
import { AchievementMetric, type UserAchievement } from '@wastegrab/shared';
import { AchievementService } from '@/services/achievement.service';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';

@Component({
  selector: 'app-customer-achievements-page',
  templateUrl: './achievements.html',
  imports: [AppHeaderComponent, EmptyStateComponent, StatGridComponent, NgIcon],
  viewProviders: [
    provideIcons({ lucideCalendarCheck, lucideCoins, lucideLoaderCircle, lucideScale, lucideTrophy, lucideTruck, lucideWifi }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerAchievementsPage implements OnInit {
  private readonly achievementService = inject(AchievementService);

  protected readonly achievements = signal<UserAchievement[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly totalPoints = computed(() => this.achievements().reduce((total, entry) => total + entry.pointsAwarded, 0));
  protected readonly totalWeightAwards = computed(() => this.achievements().filter((entry) => entry.achievement.metric === AchievementMetric.TOTAL_WEIGHT_KG).length);
  protected readonly pickupAwards = computed(() => this.achievements().filter((entry) => entry.achievement.metric === AchievementMetric.COMPLETED_PICKUPS).length);
  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucideTrophy', label: 'Unlocked', value: this.achievements().length },
    { icon: 'lucideCoins', label: 'Earned from achievements', value: this.totalPoints(), unit: 'pts' },
    { icon: 'lucideScale', label: 'Milestone types', value: `${this.totalWeightAwards()} weight · ${this.pickupAwards()} pickup`, spanClass: 'col-span-2 sm:col-span-1' },
  ]);

  ngOnInit(): void {
    this.loadAchievements();
  }

  protected metricIcon(entry: UserAchievement): string {
    return entry.achievement.metric === AchievementMetric.COMPLETED_PICKUPS ? 'lucideTruck' : 'lucideScale';
  }

  protected metricLabel(entry: UserAchievement): string {
    return entry.achievement.metric === AchievementMetric.COMPLETED_PICKUPS
      ? `${Number(entry.metricValue).toFixed(0)} completed pickups`
      : `${Number(entry.metricValue).toFixed(1)} kg contributed`;
  }

  protected dateLabel(value: string): string {
    return new Intl.DateTimeFormat('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private loadAchievements(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.achievementService.listCustomerAchievements().subscribe({
      next: (response) => this.achievements.set(response.achievements),
      error: () => {
        this.achievements.set([]);
        this.loadError.set('Unable to load achievements.');
      },
      complete: () => this.isLoading.set(false),
    });
  }
}
