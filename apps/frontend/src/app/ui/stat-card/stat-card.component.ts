import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowRight,
  lucideArrowUp,
} from '@ng-icons/lucide';

import type { StatCardTone, StatCardTrend } from './stat-card.models';

const TONE_CLASSES: Record<StatCardTone, string> = {
  brand: 'bg-primary/10 text-primary ring-primary/10',
  info: 'bg-sky-500/10 text-sky-700 ring-sky-500/10 dark:text-sky-300',
  success:
    'bg-emerald-500/10 text-emerald-700 ring-emerald-500/10 dark:text-emerald-300',
  warning:
    'bg-amber-500/10 text-amber-700 ring-amber-500/10 dark:text-amber-300',
  danger: 'bg-destructive/10 text-destructive ring-destructive/10',
  neutral: 'bg-muted text-muted-foreground ring-border',
};

const TREND_CLASSES = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
};

const TREND_ICONS = {
  up: 'lucideArrowUp',
  down: 'lucideArrowDown',
  flat: 'lucideArrowRight',
};

/**
 * Shared dashboard stat card. Keep comparison text in `trend`, not `value`,
 * so units such as kg/pts stay visually tied to the metric.
 */
@Component({
  selector: 'app-stat-card',
  imports: [NgIcon],
  template: `
    <article
      class="rounded-xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-sm transition-colors hover:bg-card sm:px-4 sm:py-3"
    >
      <div class="flex items-center gap-3">
        <span
          class="grid size-8 shrink-0 place-items-center rounded-full ring-4"
          [class]="toneClass()"
        >
          <ng-icon [name]="icon()" class="size-4.5!" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-muted-foreground">
            {{ label() }}
          </p>
          <p
            class="mt-0.5 truncate text-lg font-bold leading-none tracking-normal text-foreground sm:text-xl"
          >
            {{ value() ?? '—' }}
            @if (unit()) {
              <span class="ml-1 text-xs font-semibold text-muted-foreground">
                {{ unit() }}
              </span>
            }
          </p>
        </div>

        @if (trend(); as statTrend) {
          <div class="min-w-0 shrink-0 text-right text-xs">
            <p
              class="flex items-center justify-end gap-1 font-semibold"
              [class]="trendClass()"
            >
              <ng-icon [name]="trendIcon()" class="size-3.5!" />
              {{ statTrend.value }}
            </p>
            <p
              class="mt-0.5 max-w-20 truncate text-muted-foreground sm:max-w-28"
            >
              {{ statTrend.label }}
            </p>
          </div>
        }
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideArrowDown,
      lucideArrowRight,
      lucideArrowUp,
    }),
  ],
})
export class StatCardComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string | number | null>();
  readonly unit = input('');
  readonly tone = input<StatCardTone>('brand');
  readonly trend = input<StatCardTrend | null>(null);

  protected readonly toneClass = computed(() => TONE_CLASSES[this.tone()]);
  protected readonly trendClass = computed(
    () => TREND_CLASSES[this.trend()?.direction ?? 'flat'],
  );
  protected readonly trendIcon = computed(
    () => TREND_ICONS[this.trend()?.direction ?? 'flat'],
  );
}
