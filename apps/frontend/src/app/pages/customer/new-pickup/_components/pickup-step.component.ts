import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideMapPin, lucideSearch } from '@ng-icons/lucide';
import type { Address } from '@wastegrab/shared';

import { ZardInputDirective } from '@/ui/zard/input';
import { StepHeaderComponent } from './step-header.component';
import { formatAddress, type NewPickupForm } from './new-pickup.models';

@Component({
  selector: 'app-pickup-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, ZardInputDirective, StepHeaderComponent],
  viewProviders: [provideIcons({ lucideCheck, lucideMapPin, lucideSearch })],
  template: `
    <section
      class="rounded-2xl border border-border bg-card shadow-sm"
      data-tour="pickup-address"
    >
      <app-step-header
        title="Pickup Details"
        subtitle="Pick where the collector should come."
      />

      <div class="grid gap-5 p-4" [formGroup]="form()">
        <div class="grid gap-2">
          <span class="text-sm font-medium">Saved address</span>

          @if (addresses().length > 4) {
          <div class="relative">
            <ng-icon
              name="lucideSearch"
              class="absolute left-3 top-1/2 size-4! -translate-y-1/2 text-muted-foreground"
            />
            <input
              #addrSearch
              z-input
              type="search"
              class="w-full pl-9"
              placeholder="Search saved addresses…"
              [value]="addressQuery()"
              (input)="addressQueryChange.emit(addrSearch.value)"
              aria-label="Search saved addresses"
            />
          </div>
          }

          <div class="grid max-h-72 gap-2.5 overflow-y-auto">
            @for (address of filteredAddresses(); track address.id) {
            <button
              type="button"
              class="flex items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/40"
              [class.border-primary]="isSelected(address)"
              [class.bg-primary/5]="isSelected(address)"
              [class.border-border]="!isSelected(address)"
              (click)="addressSelect.emit(address)"
            >
              <span
                class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <ng-icon name="lucideMapPin" class="size-5!" />
              </span>

              <span class="min-w-0 flex-1">
                <span class="flex items-center gap-2">
                  <span class="truncate font-semibold">{{ address.label }}</span>
                  @if (address.isDefault) {
                  <span
                    class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >Default</span
                  >
                  }
                </span>
                <span class="mt-0.5 block text-sm text-muted-foreground"
                  >{{ addressLine(address) }}</span
                >
              </span>

              <span
                class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border"
                [class.border-primary]="isSelected(address)"
                [class.bg-primary]="isSelected(address)"
                [class.border-border]="!isSelected(address)"
              >
                @if (isSelected(address)) {
                <ng-icon
                  name="lucideCheck"
                  class="size-3.5! text-background"
                />
                }
              </span>
            </button>
            } @empty {
            <div
              class="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
            >
              @if (addresses().length === 0) { No saved addresses yet. Add one in
              your profile before requesting a pickup. } @else { No addresses
              match your search. }
            </div>
            }
          </div>
        </div>

        <div class="grid gap-2">
          <label for="description" class="text-sm font-medium"
            >Notes
            <span class="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            z-input
            id="description"
            rows="4"
            formControlName="description"
            class="min-h-28 resize-none"
            placeholder="Gate code, floor, or where the items are placed…"
            data-tour="pickup-notes"
          ></textarea>
        </div>
      </div>
    </section>
  `,
})
export class PickupStepComponent {
  readonly form = input.required<NewPickupForm>();
  readonly addresses = input.required<Address[]>();
  readonly filteredAddresses = input.required<Address[]>();
  readonly addressQuery = input('');

  readonly addressQueryChange = output<string>();
  readonly addressSelect = output<Address>();

  protected isSelected(address: Address): boolean {
    return this.form().controls.addressId.value === address.id;
  }

  protected addressLine(address: Address): string {
    return formatAddress(address);
  }
}
