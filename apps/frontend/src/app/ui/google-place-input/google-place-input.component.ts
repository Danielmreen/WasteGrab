import { ChangeDetectionStrategy, Component, OnDestroy, inject, input, output, signal } from '@angular/core';

import { ZardInputDirective } from '@/ui/zard/input';
import { PlaceSearchService, type GooglePlaceSelection, type PlacePrediction } from '@/services/place-search.service';

export type { GooglePlaceSelection } from '@/services/place-search.service';

@Component({
  selector: 'app-google-place-input',
  imports: [ZardInputDirective],
  template: `
    <div class="relative">
      <input
        z-input
        type="text"
        autocomplete="off"
        class="w-full"
        [placeholder]="placeholder()"
        [value]="query()"
        (input)="handleInput($event)"
        (focus)="openSuggestions()"
        (blur)="closeSoon()"
      />

      @if (isOpen()) {
        <div class="absolute inset-x-0  top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          @if (isLoading()) {
            <div class="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          } @else if (error()) {
            <div class="px-3 py-2 text-sm text-destructive">{{ error() }}</div>
          } @else {
            @for (prediction of predictions(); track prediction.placeId) {
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                (mousedown)="selectPrediction(prediction); $event.preventDefault()"
              >
                <span class="block font-medium text-popover-foreground">{{ prediction.mainText }}</span>
                @if (prediction.secondaryText) {
                  <span class="block text-xs text-muted-foreground">{{ prediction.secondaryText }}</span>
                }
              </button>
            } @empty {
              <div class="px-3 py-2 text-sm text-muted-foreground">No locations found.</div>
            }

            <div class="border-t border-border px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Powered by Google
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GooglePlaceInputComponent implements OnDestroy {
  private readonly placeSearch = inject(PlaceSearchService);

  readonly placeholder = input('Search Google Maps');
  readonly country = input('my');
  readonly placeSelected = output<GooglePlaceSelection>();

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly query = signal('');
  protected readonly predictions = signal<PlacePrediction[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly isOpen = signal(false);
  protected readonly error = signal('');

  ngOnDestroy(): void {
    this.clearTimers();
  }

  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.error.set('');
    this.scheduleSearch(value);
  }

  protected openSuggestions(): void {
    if (this.predictions().length > 0 || this.error()) {
      this.isOpen.set(true);
    }
  }

  protected closeSoon(): void {
    this.closeTimer = setTimeout(() => this.isOpen.set(false), 120);
  }

  protected selectPrediction(prediction: PlacePrediction): void {
    this.clearCloseTimer();
    this.query.set(prediction.description);
    this.isLoading.set(true);
    this.isOpen.set(true);

    this.placeSearch.getDetails(prediction.placeId).subscribe({
      next: (place) => {
        this.query.set(place.formattedAddress || prediction.description);
        this.placeSelected.emit(place);
        this.isLoading.set(false);
        this.isOpen.set(false);
      },
      error: () => {
        this.error.set('Could not load location details.');
        this.isLoading.set(false);
      },
    });
  }

  private scheduleSearch(value: string): void {
    this.clearSearchTimer();

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      this.predictions.set([]);
      this.isOpen.set(false);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.isOpen.set(true);

    this.searchTimer = setTimeout(() => {
      this.placeSearch.autocomplete(trimmedValue, this.country()).subscribe({
        next: ({ predictions }) => {
          this.predictions.set(predictions);
          this.error.set('');
          this.isLoading.set(false);
          this.isOpen.set(true);
        },
        error: () => {
          this.predictions.set([]);
          this.error.set('Location search is unavailable.');
          this.isLoading.set(false);
          this.isOpen.set(true);
        },
      });
    }, 250);
  }

  private clearTimers(): void {
    this.clearSearchTimer();
    this.clearCloseTimer();
  }

  private clearSearchTimer(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  private clearCloseTimer(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}
