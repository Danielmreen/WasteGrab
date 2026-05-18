import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZardCardComponent } from '@/components/card/card.component';
import { ZardButtonComponent } from '@/components/button/button.component';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'z-modal',
  standalone: true,
  imports: [CommonModule, ZardCardComponent, ZardButtonComponent],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6 sm:px-6">
        <z-card [class]="'relative w-full border bg-background shadow-lg rounded-lg max-w-[calc(100%-1rem)] ' + sizeClass()">
          <div class="space-y-4 sm:space-y-6">
            @if (title() || description()) {
              <header class="flex flex-col space-y-1.5 text-center sm:text-left">
                @if (title()) {
                  <h4 class="text-lg leading-none font-semibold tracking-tight">{{ title() }}</h4>
                }

                @if (description()) {
                  <p class="text-muted-foreground text-sm">{{ description() }}</p>
                }
              </header>
            }

            @if (error()) {
              <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {{ error() }}
              </div>
            }

            <main class="flex flex-col space-y-4">
              <ng-content></ng-content>
            </main>

            @if (showCancel() || showOk()) {
              <footer class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
                @if (showCancel()) {
                  <button
                    type="button"
                    z-button
                    zType="outline"
                    (click)="onCancel()"
                    [disabled]="isSubmitting()"
                  >
                    {{ cancelText() }}
                  </button>
                }

                @if (showOk()) {
                  <button
                    type="button"
                    z-button
                    [zType]="okDestructive() ? 'destructive' : 'default'"
                    [zDisabled]="isSubmitting()"
                    (click)="onOk()"
                  >
                    {{ isSubmitting() ? okLoadingText() : okText() }}
                  </button>
                }
              </footer>
            }
          </div>
        </z-card>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZardModalComponent {
  // Inputs
  isOpen = input(false);
  title = input('');
  description = input('');
  error = input('');
  size = input<ModalSize>('md');
  okText = input('OK');
  okLoadingText = input('Loading...');
  okDestructive = input(false);
  cancelText = input('Cancel');
  showOk = input(true);
  showCancel = input(true);
  isSubmitting = input(false);

  // Outputs
  ok = output<void>();
  cancel = output<void>();

  // Computed size class
  sizeClass() {
    const sizes: Record<ModalSize, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
    };
    return sizes[this.size()];
  }

  onOk(): void {
    this.ok.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
