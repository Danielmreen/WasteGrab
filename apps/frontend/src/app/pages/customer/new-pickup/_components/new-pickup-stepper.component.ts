import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronRight } from '@ng-icons/lucide';

import type { StepMeta, WizardStep } from './new-pickup.models';

@Component({
  selector: 'app-new-pickup-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideCheck, lucideChevronRight })],
  template: `
    <nav
      class="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm"
      aria-label="Pickup request steps"
      data-tour="pickup-steps"
    >
      @for (step of steps(); let index = $index; let last = $last; track step.id)
      {
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        [class.bg-primary/5]="isActive(step.id)"
        [disabled]="disabled()"
        (click)="stepSelect.emit(step.id)"
      >
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          [class.bg-primary]="isActive(step.id) || isComplete(index)"
          [class.text-primary-foreground]="isActive(step.id) || isComplete(index)"
          [class.border]="!isActive(step.id) && !isComplete(index)"
          [class.border-border]="!isActive(step.id) && !isComplete(index)"
          [class.text-muted-foreground]="!isActive(step.id) && !isComplete(index)"
        >
          @if (isComplete(index)) {
          <ng-icon name="lucideCheck" class="size-4!" />
          } @else { {{ index + 1 }} }
        </span>
        <span class="hidden min-w-0 sm:block">
          <span
            class="block truncate font-semibold"
            [class.text-primary]="isActive(step.id)"
            [class.text-foreground]="!isActive(step.id)"
            >{{ step.label }}</span
          >
          <span class="block truncate text-xs text-muted-foreground">{{
            step.hint
          }}</span>
        </span>
      </button>
      @if (!last) {
      <ng-icon
        name="lucideChevronRight"
        class="size-4! shrink-0 text-muted-foreground/60"
      />
      } }
    </nav>
  `,
})
export class NewPickupStepperComponent {
  readonly steps = input.required<StepMeta[]>();
  readonly current = input.required<WizardStep>();
  readonly currentIndex = input.required<number>();
  readonly disabled = input(false);

  readonly stepSelect = output<WizardStep>();

  protected isActive(step: WizardStep): boolean {
    return this.current() === step;
  }

  protected isComplete(index: number): boolean {
    return index < this.currentIndex();
  }
}
