import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideLoaderCircle,
  lucideSparkles,
  lucideUpload,
  lucideX,
} from '@ng-icons/lucide';

import { StepHeaderComponent } from './step-header.component';
import type { PreviewImage } from './new-pickup.models';

@Component({
  selector: 'app-images-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIcon, StepHeaderComponent],
  viewProviders: [
    provideIcons({
      lucideArrowRight,
      lucideLoaderCircle,
      lucideSparkles,
      lucideUpload,
      lucideX,
    }),
  ],
  template: `
    <section
      class="rounded-2xl border border-border bg-card shadow-sm"
      data-tour="pickup-images"
    >
      <app-step-header
        title="Upload Images"
        [subtitle]="images().length + '/' + maxImages() + ' selected'"
      >
        @if (images().length) {
        <button
          stepHeaderActions
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          (click)="clear.emit()"
          [disabled]="isAnalyzing() || disabled()"
          aria-label="Clear images"
        >
          <ng-icon name="lucideX" class="size-4!" />
        </button>
        }
      </app-step-header>

      <div class="grid gap-4 p-4">
        <input
          #fileInput
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          (change)="filesSelected.emit($event)"
        />

        <button
          type="button"
          class="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          (click)="fileInput.click()"
          [disabled]="images().length >= maxImages() || isAnalyzing() || disabled()"
          data-tour="pickup-upload"
        >
          <span
            class="flex size-12 items-center justify-center rounded-full bg-background text-primary shadow-sm"
          >
            <ng-icon name="lucideUpload" class="size-6!" />
          </span>
          <span class="mt-3 text-sm font-medium">
            {{ images().length ? 'Choose more photos' : 'Choose waste photos' }}
          </span>
          <span class="mt-1 text-xs text-muted-foreground"
            >JPG, PNG, WEBP, or AVIF</span
          >
        </button>

        @if (images().length) {
        <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
          @for (image of images(); let index = $index; track image.url) {
          <div
            class="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
          >
            <img
              [src]="image.url"
              [alt]="'Pickup image ' + (index + 1)"
              class="size-full object-cover"
              [class.animate-pulse]="isAnalyzing()"
            />

            @if (isAnalyzing()) {
            <div class="absolute inset-0 grid place-items-center bg-primary/15">
              <div
                class="flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-xs font-semibold text-primary shadow-sm"
              >
                <ng-icon name="lucideLoaderCircle" class="size-4! animate-spin" />
                Scanning
              </div>
            </div>
            } @else {
            <button
              type="button"
              class="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
              (click)="remove.emit(index)"
              aria-label="Remove image"
            >
              <ng-icon name="lucideX" class="size-4!" />
            </button>
            }
          </div>
          }
        </div>
        }

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            [ngClass]="
              images().length && !isAnalyzing()
                ? 'ring-4 ring-primary/15 shadow-lg shadow-primary/25'
                : ''
            "
            (click)="analyze.emit()"
            [disabled]="isAnalyzing() || !images().length || disabled()"
            [attr.aria-label]="isAnalyzing() ? 'Analyzing images' : 'Analyze images with AI'"
            [title]="isAnalyzing() ? 'Analyzing images' : 'Analyze images with AI'"
            data-tour="pickup-ai"
          >
            @if (images().length && !isAnalyzing()) {
            <span
              class="absolute inset-0 rounded-full bg-primary/40 animate-ping"
            ></span>
            } @if (isAnalyzing()) {
            <ng-icon name="lucideLoaderCircle" class="size-5! animate-spin" />
            } @else {
            <ng-icon
              name="lucideSparkles"
              class="relative size-5!"
              [class.animate-pulse]="images().length"
            />
            }
          </button>

          <button
            type="button"
            class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            (click)="next.emit()"
            [disabled]="!canGoNext() || disabled()"
          >
            Continue
            <ng-icon name="lucideArrowRight" class="size-4!" />
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ImagesStepComponent {
  readonly images = input.required<PreviewImage[]>();
  readonly maxImages = input.required<number>();
  readonly isAnalyzing = input(false);
  readonly disabled = input(false);
  readonly canGoNext = input(false);

  readonly filesSelected = output<Event>();
  readonly clear = output<void>();
  readonly remove = output<number>();
  readonly analyze = output<void>();
  readonly next = output<void>();
}
