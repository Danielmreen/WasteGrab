import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * Shared empty-state block for lists and tables. The icon is resolved against
 * the icon registry of the consuming page, so register lucide icons via
 * provideIcons there. Project an action button/link as default content.
 */
@Component({
  selector: 'app-empty-state',
  imports: [NgIcon],
  template: `
    <div
      class="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center"
    >
      <div class="grid justify-items-center">
        <span class="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <ng-icon [name]="icon()" class="size-6!" />
        </span>
        <h3 class="mt-3 text-base font-semibold">{{ title() }}</h3>
        <p class="mt-1 max-w-sm text-sm text-muted-foreground">{{ description() }}</p>
        <div class="mt-4 empty:hidden">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input('lucideInbox');
  readonly title = input.required<string>();
  readonly description = input('');
}
