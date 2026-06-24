import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Card section header used across the New Pickup wizard steps.
 * Project a leading chip with `[stepHeaderIcon]` and trailing controls with
 * `[stepHeaderActions]`.
 */
@Component({
  selector: 'app-step-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
    >
      <div class="flex items-center gap-3">
        <ng-content select="[stepHeaderIcon]" />
        <div>
          <h2 class="text-sm font-semibold">{{ title() }}</h2>
          @if (subtitle()) {
          <p class="text-xs text-muted-foreground">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <ng-content select="[stepHeaderActions]" />
    </div>
  `,
})
export class StepHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null | undefined>(null);
}
