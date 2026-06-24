import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [RouterLink, NgIcon],
  template: `
    <section
      [attr.id]="sectionId() || null"
      class="scroll-mt-20 rounded-2xl border border-border/70 bg-card p-3 shadow-sm"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          @if (icon()) {
            <span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
            >
              <ng-icon [name]="icon()" class="size-4!" />
            </span>
          }
          <h2 class="truncate text-base font-semibold text-foreground">
            {{ title() }}
          </h2>
        </div>

        @if (actionRoute(); as route) {
          <a
            [routerLink]="route"
            class="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {{ actionLabel() }}
          </a>
        }
      </div>

      <ng-content />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPanelComponent {
  readonly title = input.required<string>();
  readonly icon = input('');
  readonly actionLabel = input('View All');
  readonly actionRoute = input<readonly string[] | null>(null);
  readonly sectionId = input('');
}
