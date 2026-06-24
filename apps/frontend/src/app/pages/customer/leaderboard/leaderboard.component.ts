import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { PickupRequestService } from '@/services/pickup-request.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAward,
  lucideChevronRight,
  lucideCrown,
  lucideLoaderCircle,
  lucideMedal,
  lucideRecycle,
  lucideScale,
  lucideTrophy,
  lucideUser,
  lucideUsers,
  lucideWifi,
} from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';
import type { LeaderboardEntry } from '@wastegrab/shared';

@Component({
  selector: 'app-customer-leaderboard-page',
  templateUrl: './leaderboard.html',
  imports: [
    AppHeaderComponent,
    EmptyStateComponent,
    NgIcon,
    TableHeaderComponent,
    StatGridComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideAward,
      lucideChevronRight,
      lucideCrown,
      lucideLoaderCircle,
      lucideMedal,
      lucideRecycle,
      lucideScale,
      lucideTrophy,
      lucideUser,
      lucideUsers,
      lucideWifi,
    }),
  ],
})
export class CustomerLeaderboardPage {
  private readonly pickupRequests = inject(PickupRequestService);

  protected readonly leaderboard = signal<LeaderboardEntry[]>([]);
  protected readonly currentUserRank = signal<LeaderboardEntry | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');

  protected readonly topThree = computed(() => this.leaderboard().slice(0, 3));
  protected readonly remainingEntries = computed(() =>
    this.leaderboard().slice(3),
  );
  protected readonly currentUserIsVisible = computed(() =>
    this.currentUserRank()
      ? this.leaderboard().some(
          (entry) => entry.userId === this.currentUserRank()?.userId,
        )
      : true,
  );
  protected readonly totalVisibleWeight = computed(() =>
    this.leaderboard().reduce(
      (total, entry) => total + Number(entry.totalWeightKg),
      0,
    ),
  );

  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucideUsers', label: 'Participants', value: this.leaderboard().length },
    { icon: 'lucideScale', label: 'Community Weight', value: this.totalVisibleWeight().toFixed(1), unit: 'kg' },
    { icon: 'lucideAward', label: 'Your Rank', value: this.currentUserRank()?.rank != null ? `#${this.currentUserRank()?.rank}` : '—', spanClass: 'col-span-2 sm:col-span-1' },
  ]);

  constructor() {
    void this.loadLeaderboard();
  }

  protected initials(name: string): string {
    return (
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'U'
    );
  }

  protected rankBadgeClass(rank: number): string {
    switch (rank) {
      case 1: return 'bg-yellow-400 text-yellow-900';
      case 2: return 'bg-slate-300 text-slate-700';
      default: return 'bg-orange-500 text-white';
    }
  }

  protected rankClass(rank: number): string {
    switch (rank) {
      case 1:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case 2:
        return 'bg-muted text-muted-foreground';
      case 3:
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-primary/10 text-primary';
    }
  }

  protected weightLabel(entry: LeaderboardEntry): string {
    return `${Number(entry.totalWeightKg).toFixed(1)} kg`;
  }

  /** Bar width relative to the #1 contributor, floored so small values stay visible. */
  protected barPercent(entry: LeaderboardEntry): number {
    const top = Number(this.leaderboard()[0]?.totalWeightKg ?? 0);
    if (!top) return 0;
    return Math.max(4, Math.round((Number(entry.totalWeightKg) / top) * 100));
  }

  protected medalIcon(rank: number): string {
    return rank === 1 ? 'lucideCrown' : 'lucideMedal';
  }

  protected podiumOrder(rank: number): string {
    return rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3';
  }

  protected podiumBarClass(rank: number): string {
    switch (rank) {
      case 1: return 'h-40 sm:h-52 lg:h-64 bg-linear-to-b from-amber-400 to-yellow-500';
      case 2: return 'h-28 sm:h-36 lg:h-48 bg-linear-to-b from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600';
      default: return 'h-20 sm:h-28 lg:h-36 bg-linear-to-b from-orange-400 to-orange-600';
    }
  }

  protected podiumAvatarSize(rank: number): string {
    return rank === 1 ? 'size-20 sm:size-24 text-xl' : 'size-16 sm:size-20 text-base';
  }

  protected podiumRingClass(rank: number): string {
    switch (rank) {
      case 1: return 'ring-4 ring-yellow-400';
      case 2: return 'ring-4 ring-slate-300 dark:ring-slate-500';
      default: return 'ring-4 ring-orange-400';
    }
  }

  private async loadLeaderboard(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const response = await firstValueFrom(this.pickupRequests.getLeaderboard());
      this.leaderboard.set(response.leaderboard);
      this.currentUserRank.set(response.currentUser);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      this.loadError.set('Unable to load leaderboard.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
