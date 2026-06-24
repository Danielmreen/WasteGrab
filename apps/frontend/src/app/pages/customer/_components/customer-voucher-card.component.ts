import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCoins, lucideTicket } from '@ng-icons/lucide';

export type VoucherCardItem = {
  imageUrl?: string | null;
  title: string;
  description?: string | null;
  leftValue: string | number;
  leftLabel: string;
  leftIcon: string;
  badgeLabel?: string | null;
  badgeClass?: string;
  code?: string | null;
  meta?: string | null;
  route?: readonly string[] | null;
};

@Component({
  selector: 'app-customer-voucher-card',
  standalone: true,
  host: { class: 'block h-full' },
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucideCoins, lucideTicket })],
  template: `
    <article
      class="ticket-notch relative flex h-full rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl"
      [class]="cardClass()"
    >
      <!-- Left: image bg + points -->
      <div
        class="relative flex w-20 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-l-2xl px-2 py-3 sm:w-28 sm:gap-1 sm:rounded-l-3xl sm:px-3 sm:py-6"
        [class]="item().imageUrl ? '' : defaultLeftBg()"
      >
        @if (item().imageUrl) {
          <img
            [src]="item().imageUrl"
            alt=""
            aria-hidden="true"
            class="absolute inset-0 size-full object-cover"
          />
          <div
            class="absolute inset-0 rounded-l-2xl bg-linear-to-b from-black/50 to-black/70 sm:rounded-l-3xl"
          ></div>
        }
        <div class="relative z-10 flex flex-col items-center gap-1">
          <ng-icon
            [name]="item().leftIcon"
            class="size-3.5! sm:size-5!"
            [class]="item().imageUrl ? 'text-white/80' : leftIconClass()"
          />
          <p
            class="text-lg font-black leading-none sm:text-2xl"
            [class]="item().imageUrl ? 'text-white' : leftValueClass()"
          >
            {{ item().leftValue }}
          </p>
          <p
            class="text-[8px] font-bold uppercase tracking-widest sm:text-[10px]"
            [class]="item().imageUrl ? 'text-white/60' : leftLabelClass()"
          >
            {{ item().leftLabel }}
          </p>
        </div>
      </div>

      <!-- Tear line -->
      <div class="flex flex-col items-center">
        <div class="my-3 flex-1 border-l border-dashed border-border/70"></div>
      </div>

      <!-- Right: details -->
      <div class="flex min-w-0 flex-1 flex-col justify-between gap-1.5 p-2.5 sm:gap-3 sm:p-4">
        <div class="min-w-0">
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-sm/snug font-bold leading-snug text-foreground">
              {{ item().title }}
            </h2>
            @if (item().badgeLabel) {
              <span
                class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:px-2 sm:text-[10px]"
                [class]="item().badgeClass ?? 'bg-muted text-muted-foreground'"
              >
                {{ item().badgeLabel }}
              </span>
            }
          </div>
          @if (item().description) {
            <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {{ item().description }}
            </p>
          }
          @if (item().meta) {
            <p class="mt-0.5 text-[11px] text-muted-foreground">
              {{ item().meta }}
            </p>
          }
        </div>

        <!-- Code block or ng-content action -->
        @if (item().code) {
          <div
            class="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-1.5 py-1 text-center sm:rounded-xl sm:px-2.5 sm:py-1.5"
          >
            <p
              class="text-[8px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[9px]"
            >
              Your Code
            </p>
            <p
              class="mt-0.5 font-mono text-[11px] font-black tracking-wider text-primary sm:text-sm"
            >
              {{ item().code }}
            </p>
          </div>
        } @else {
          <ng-content />
        }
      </div>

      <!-- Optional link overlay -->
      @if (item().route) {
        <a
          [routerLink]="item().route"
          class="absolute inset-0 rounded-2xl sm:rounded-3xl"
          aria-label="{{ item().title }}"
        ></a>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerVoucherCardComponent {
  readonly item = input.required<VoucherCardItem>();
  readonly muted = input(false);

  protected cardClass(): string {
    return this.muted() ? 'opacity-90' : 'card-lift';
  }

  protected defaultLeftBg(): string {
    return this.muted()
      ? 'bg-muted/60'
      : 'bg-linear-to-b from-primary/30 to-primary/10';
  }

  protected leftIconClass(): string {
    return this.muted()
      ? 'text-emerald-600/60 dark:text-emerald-400/60'
      : 'text-primary/60';
  }

  protected leftValueClass(): string {
    return this.muted() ? 'text-foreground' : 'text-primary';
  }

  protected leftLabelClass(): string {
    return this.muted() ? 'text-muted-foreground' : 'text-primary/60';
  }
}
