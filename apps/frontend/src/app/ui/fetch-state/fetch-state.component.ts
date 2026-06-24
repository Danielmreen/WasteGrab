import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-fetch-state',
  standalone: true,
  template: `
    @if (isLoading()) {
      <section
        class="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground"
      >
        <div class="grid justify-items-center gap-3">
          <span
            class="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
            aria-hidden="true"
          ></span>
          <p class="text-sm font-semibold">{{ loadingText() }}</p>
        </div>
      </section>
    } @else if (loadError()) {
      <section
        class="grid min-h-40 place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      >
        <p class="font-semibold text-destructive">{{ loadError() }}</p>
      </section>
    } @else {
      <ng-content />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FetchStateComponent {
  readonly isLoading = input(false);
  readonly loadError = input('');
  readonly loadingText = input('Loading data...');
}
