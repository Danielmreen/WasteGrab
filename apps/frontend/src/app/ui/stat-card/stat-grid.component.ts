import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StatCardComponent } from './stat-card.component';
import type { StatCardItem } from './stat-card.models';

@Component({
  selector: 'app-stat-grid',
  standalone: true,
  imports: [StatCardComponent],
  template: `
    <section [class]="gridClass()">
      @for (stat of stats(); track stat.label) {
        <app-stat-card
          [class]="stat.spanClass ?? ''"
          [icon]="stat.icon"
          [label]="stat.label"
          [value]="stat.value"
          [unit]="stat.unit ?? ''"
          [tone]="stat.tone ?? 'brand'"
          [trend]="stat.trend ?? null"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatGridComponent {
  readonly stats = input.required<StatCardItem[]>();
  readonly gridClass = input('grid grid-cols-2 gap-3 lg:grid-cols-4');
}
