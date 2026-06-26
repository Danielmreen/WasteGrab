import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideNavigation } from '@ng-icons/lucide';

@Component({
  selector: 'app-collector-location-bar',
  standalone: true,
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideNavigation })],
  template: `
    <div
      class="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-4"
    >
      <span class="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span
          class="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
        >
          <ng-icon name="lucideNavigation" class="size-3.5!" />
        </span>
        {{ statusLabel() }}
      </span>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-background shadow-sm transition-colors"
        (click)="refresh.emit()"
      >
        <ng-icon name="lucideNavigation" class="size-4!" />
        Update my location
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorLocationBarComponent {
  readonly statusLabel = input.required<string>();
  readonly refresh = output<void>();
}
