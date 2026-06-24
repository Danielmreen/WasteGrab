import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2 } from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';

import { ROUTE_PATHS, routePath } from '@/app-route-paths';
import { AuthService } from '@/services/auth.service';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';

@Component({
  selector: 'app-admin-onboarding',
  imports: [NgIcon, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideCheckCircle2 })],
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <section class="my-auto w-full max-w-xl rounded-lg border border-border bg-background shadow-2xl">
        <div class="px-5 py-6 sm:px-6">
          <div class="flex items-start gap-4">
            <div class="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <ng-icon name="lucideCheckCircle2" class="size-6" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-primary">Admin setup</p>
              <h2 class="mt-1 text-2xl font-bold tracking-tight text-foreground">Welcome to WasteGrab</h2>
              <p class="mt-2 text-sm/6  text-muted-foreground">
                Your admin workspace is ready.
              </p>
            </div>
          </div>

          @if (onboardingError()) {
            <div class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ onboardingError() }}
            </div>
          }
        </div>

        <div class="flex justify-end border-t border-border px-5 py-4 sm:px-6">
          <button z-button type="button" [zLoading]="isBusy()" (click)="finishOnboarding()">
            Continue
          </button>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOnboardingComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isBusy = signal(false);
  protected readonly onboardingError = signal<string | null>(null);

  protected async finishOnboarding(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.isBusy.set(true);
    this.onboardingError.set(null);

    try {
      await firstValueFrom(this.authService.completeOnboarding());
      await this.router.navigateByUrl(routePath(ROUTE_PATHS.admin.base));
    } catch (error) {
      this.onboardingError.set(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      this.isBusy.set(false);
    }
  }
}
