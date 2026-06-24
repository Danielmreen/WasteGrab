import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRecycle } from '@ng-icons/lucide';

/**
 * Waste-category thumbnail: shows the category image when available, otherwise a
 * neutral recycle chip. Size/rounding is controlled via the `chipClass` input.
 */
@Component({
  selector: 'app-category-thumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideRecycle })],
  template: `
    @if (imageUrl()) {
    <img
      [src]="imageUrl()"
      [alt]="name() || 'Category'"
      [class]="
        'shrink-0 rounded-xl border border-border object-cover ' + chipClass()
      "
      draggable="false"
    />
    } @else {
    <span
      [class]="
        'flex shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ' +
        chipClass()
      "
    >
      <ng-icon name="lucideRecycle" class="size-5!" />
    </span>
    }
  `,
})
export class CategoryThumbComponent {
  readonly imageUrl = input<string | null | undefined>(null);
  readonly name = input<string | null | undefined>(null);
  readonly chipClass = input('size-9');
}
