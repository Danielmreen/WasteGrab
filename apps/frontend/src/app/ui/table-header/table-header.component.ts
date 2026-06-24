import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

export type FilterOption<T extends string = string> = {
  value: T;
  label: string;
};

@Component({
  selector: 'app-table-header',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <h2 class="text-base font-bold text-foreground">{{ title() }}</h2>
        @if (description()) {
          <p class="text-xs text-muted-foreground">{{ description() }}</p>
        }
      </div>

      @if (filters().length > 0) {
        <div class="flex items-center gap-1.5 rounded-2xl bg-muted p-1">
          @for (filter of filters(); track filter.value) {
            <button
              type="button"
              (click)="filterChange.emit(filter.value)"
              class="rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              [class]="activeFilter() === filter.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
            >
              {{ filter.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class TableHeaderComponent<T extends string = string> {
  // Inputs
  readonly title = input('');
  readonly description = input('');
  readonly filters = input<FilterOption<T>[]>([]);
  readonly activeFilter = input<T | string>('');

  // Outputs
  readonly filterChange = output<T>();
}
