import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideCheckCircle2,
  lucideChevronLeft,
  lucideChevronRight,
  lucideMapPin,
  lucideMoon,
  lucideSmartphone,
  lucideTruck,
} from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';

import { ROUTE_PATHS, routePath } from '@/app-route-paths';
import { AuthService } from '@/services/auth.service';
import { NotificationService } from '@/services/notification.service';
import { ThemeService } from '@/services/theme.service';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';

type CollectorOnboardingStep = 'location' | 'notifications' | 'preferences' | 'done';
type LocationPermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const COLLECTOR_ONBOARDING_STEPS: { key: CollectorOnboardingStep; label: string; icon: string }[] = [
  { key: 'location', label: 'Location', icon: 'lucideMapPin' },
  { key: 'notifications', label: 'Alerts', icon: 'lucideBell' },
  { key: 'preferences', label: 'App', icon: 'lucideSmartphone' },
  { key: 'done', label: 'Done', icon: 'lucideCheckCircle2' },
];

@Component({
  selector: 'app-collector-onboarding',
  imports: [NgIcon, ZardButtonComponent],
  viewProviders: [
    provideIcons({
      lucideBell,
      lucideCheckCircle2,
      lucideChevronLeft,
      lucideChevronRight,
      lucideMapPin,
      lucideMoon,
      lucideSmartphone,
      lucideTruck,
    }),
  ],
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm">
      <section class="my-auto w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl">
        <div class="border-b border-border p-5  sm:px-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <div class="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <ng-icon [name]="activeStepMeta().icon" class="size-6" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-primary">Collector setup</p>
                <h2 class="mt-1 text-2xl font-bold tracking-tight text-foreground">{{ stepTitle() }}</h2>
                <p class="mt-2 text-sm/6  text-muted-foreground">{{ stepDescription() }}</p>
              </div>
            </div>
            <button z-button zType="ghost" type="button" [zDisabled]="isBusy()" (click)="finishOnboarding()">
              Skip setup
            </button>
          </div>

          <div class="mt-5 grid grid-cols-4 gap-2">
            @for (step of steps; track step.key; let index = $index) {
              <button
                type="button"
                class="flex min-w-0 flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs transition"
                [class.border-primary]="index <= activeStepIndex()"
                [class.bg-primary/10]="index === activeStepIndex()"
                [class.text-primary]="index <= activeStepIndex()"
                [class.border-border]="index > activeStepIndex()"
                [class.text-muted-foreground]="index > activeStepIndex()"
                [disabled]="index > activeStepIndex() || isBusy()"
                (click)="goToStep(step.key)"
              >
                <ng-icon [name]="step.icon" class="size-4" />
                <span class="hidden sm:inline">{{ step.label }}</span>
              </button>
            }
          </div>
        </div>

        <div class="p-5  sm:px-6">
          @switch (activeStep()) {
            @case ('location') {
              <div class="rounded-xl border border-border bg-card p-5">
                <div class="flex items-start gap-4">
                  <div class="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <ng-icon name="lucideMapPin" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-base font-semibold text-foreground">Allow location access</h3>
                    <p class="mt-1 text-sm/6  text-muted-foreground">
                      WasteGrab uses your current location to help match nearby pickup requests and collection points.
                    </p>
                    <p class="mt-3 text-sm font-medium" [class.text-primary]="locationPermissionStatus() === 'granted'" [class.text-destructive]="locationPermissionStatus() === 'denied'" [class.text-muted-foreground]="locationPermissionStatus() !== 'granted' && locationPermissionStatus() !== 'denied'">
                      {{ locationPermissionLabel() }}
                    </p>
                  </div>
                </div>
              </div>
            }

            @case ('notifications') {
              <div class="rounded-xl border border-border bg-card p-5">
                <div class="flex items-start gap-4">
                  <div class="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <ng-icon name="lucideBell" class="size-5" />
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-base font-semibold text-foreground">Pickup alerts</h3>
                    <p class="mt-1 text-sm/6  text-muted-foreground">
                      Get notified when new assignments and pickup updates need your attention.
                    </p>
                    <p class="mt-3 text-sm font-medium" [class.text-primary]="notificationStatus() === 'enabled'" [class.text-muted-foreground]="notificationStatus() !== 'enabled'">
                      {{ notificationStatusLabel() }}
                    </p>
                  </div>
                </div>
              </div>
            }

            @case ('preferences') {
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  class="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-muted"
                  (click)="toggleDarkMode()"
                >
                  <div class="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                    <ng-icon name="lucideMoon" class="size-5" />
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-foreground">Dark mode</h3>
                    <p class="mt-1 text-sm/5  text-muted-foreground">{{ darkMode() ? 'Dark theme is on.' : 'Light theme is on.' }}</p>
                  </div>
                </button>
                <button
                  type="button"
                  class="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:bg-muted disabled:opacity-60"
                  [disabled]="!canInstallPwa()"
                  (click)="installPwa()"
                >
                  <div class="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                    <ng-icon name="lucideSmartphone" class="size-5" />
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-foreground">Install app</h3>
                    <p class="mt-1 text-sm/5  text-muted-foreground">
                      {{ pwaStatusLabel() }}
                    </p>
                  </div>
                </button>
              </div>
            }

            @case ('done') {
              <div class="rounded-lg border border-primary/30 bg-primary/10 p-5 text-center">
                <div class="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                  <ng-icon name="lucideCheckCircle2" class="size-6" />
                </div>
                <h3 class="mt-4 text-lg font-semibold text-foreground">You are ready</h3>
                <p class="mx-auto mt-2 max-w-md text-sm/6  text-muted-foreground">
                  Your collector setup is saved. You can start reviewing pickup work from the collector area.
                </p>
              </div>
            }
          }

          @if (onboardingError()) {
            <div class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {{ onboardingError() }}
            </div>
          }
        </div>

        <div class="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
          <button
            z-button
            zType="outline"
            type="button"
            [zDisabled]="activeStepIndex() === 0 || isBusy()"
            (click)="previousStep()"
          >
            <ng-icon name="lucideChevronLeft" />
            Back
          </button>
          <div class="flex flex-col gap-3 sm:flex-row">
            @if (activeStep() === 'location') {
              <button z-button zType="outline" type="button" [zDisabled]="isBusy()" (click)="nextStep()">
                Not now
              </button>
              <button z-button type="button" [zLoading]="isBusy()" [zDisabled]="!canAskForLocation()" (click)="requestLocationAndContinue()">
                Allow location
              </button>
            } @else if (activeStep() === 'notifications') {
              <button z-button zType="outline" type="button" [zDisabled]="isBusy()" (click)="nextStep()">
                Not now
              </button>
              <button z-button type="button" [zLoading]="isBusy()" [zDisabled]="!canAskForNotifications()" (click)="enableNotificationsAndContinue()">
                Enable alerts
              </button>
            } @else if (activeStep() === 'done') {
              <button z-button type="button" [zLoading]="isBusy()" (click)="finishOnboarding('collectorPickups')">
                <ng-icon name="lucideTruck" />
                View pickups
              </button>
            } @else {
              <button z-button type="button" [zLoading]="isBusy()" (click)="nextStep()">
                Continue
                <ng-icon name="lucideChevronRight" />
              </button>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorOnboardingComponent {
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly themeService = inject(ThemeService);

  protected readonly steps = COLLECTOR_ONBOARDING_STEPS;
  protected readonly activeStep = signal<CollectorOnboardingStep>('location');
  protected readonly darkMode = signal(this.themeService.isDark());
  protected readonly installPrompt = signal<BeforeInstallPromptEvent | null>(null);
  protected readonly isBusy = signal(false);
  protected readonly locationPermissionStatus = signal<LocationPermissionStatus>('idle');
  protected readonly onboardingError = signal<string | null>(null);

  protected readonly activeStepIndex = computed(() => this.steps.findIndex((step) => step.key === this.activeStep()));
  protected readonly activeStepMeta = computed(() => this.steps[this.activeStepIndex()] ?? this.steps[0]);
  protected readonly canInstallPwa = computed(() => this.installPrompt() !== null || this.isIosSafari());
  protected readonly notificationStatus = computed(() => {
    if (this.notificationService.hasEnabledPush()) {
      return 'enabled';
    }

    if (typeof Notification === 'undefined') {
      return 'unavailable';
    }

    return Notification.permission === 'granted' ? 'enabled' : Notification.permission;
  });
  protected readonly canAskForNotifications = computed(() => (
    this.notificationService.canEnablePush() && this.notificationStatus() !== 'denied'
  ));
  protected readonly canAskForLocation = computed(() => (
    this.locationPermissionStatus() !== 'requesting' && this.locationPermissionStatus() !== 'unsupported'
  ));

  constructor() {
    void this.loadOnboardingData();
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  protected captureInstallPrompt(event: Event): void {
    event.preventDefault();
    this.installPrompt.set(event as BeforeInstallPromptEvent);
  }

  protected stepTitle(): string {
    switch (this.activeStep()) {
      case 'location':
        return 'Share your current location';
      case 'notifications':
        return 'Turn on pickup notifications';
      case 'preferences':
        return 'Choose app preferences';
      case 'done':
        return 'Setup complete';
    }
  }

  protected stepDescription(): string {
    switch (this.activeStep()) {
      case 'location':
        return 'Location helps WasteGrab show nearby pickup work and collection points.';
      case 'notifications':
        return 'Status alerts help you follow each pickup without checking manually.';
      case 'preferences':
        return 'Set your app theme and install WasteGrab when your browser supports it.';
      case 'done':
        return 'You can head to collector pickups when you are ready.';
    }
  }

  protected locationPermissionLabel(): string {
    switch (this.locationPermissionStatus()) {
      case 'requesting':
        return 'Waiting for browser permission...';
      case 'granted':
        return 'Location access is enabled for this session.';
      case 'denied':
        return 'Location was blocked. You can allow it from browser settings later.';
      case 'unsupported':
        return 'Location permission is not available in this browser session.';
      default:
        return 'Location permission has not been requested yet.';
    }
  }

  protected notificationStatusLabel(): string {
    if (this.notificationStatus() === 'enabled') {
      return 'Notifications are enabled.';
    }

    if (!this.notificationService.canEnablePush()) {
      return 'Push notifications are not available in this browser session.';
    }

    switch (this.notificationStatus()) {
      case 'denied':
        return 'Notifications were blocked in the browser settings.';
      default:
        return 'Notifications are optional and can be enabled now.';
    }
  }

  protected pwaStatusLabel(): string {
    return this.canInstallPwa()
      ? 'Install WasteGrab on this device.'
      : 'Install will appear here when the browser offers it.';
  }

  protected goToStep(step: CollectorOnboardingStep): void {
    const targetIndex = this.steps.findIndex((item) => item.key === step);

    if (targetIndex <= this.activeStepIndex()) {
      this.activeStep.set(step);
    }
  }

  protected previousStep(): void {
    this.moveToIndex(Math.max(this.activeStepIndex() - 1, 0));
  }

  protected nextStep(): void {
    this.moveToIndex(Math.min(this.activeStepIndex() + 1, this.steps.length - 1));
  }

  protected async requestLocationAndContinue(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    if (!('geolocation' in navigator)) {
      this.locationPermissionStatus.set('unsupported');
      this.onboardingError.set('Location permission is not available in this browser.');
      return;
    }

    this.isBusy.set(true);
    this.onboardingError.set(null);
    this.locationPermissionStatus.set('requesting');

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 60_000,
          timeout: 10_000,
        });
      });
      this.locationPermissionStatus.set('granted');
      this.nextStep();
    } catch {
      this.locationPermissionStatus.set('denied');
      this.onboardingError.set('Location permission was not granted. You can continue and enable it later from browser settings.');
    } finally {
      this.isBusy.set(false);
    }
  }

  protected async enableNotificationsAndContinue(): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.isBusy.set(true);
    this.onboardingError.set(null);

    try {
      await this.notificationService.enablePushNotifications();
      this.nextStep();
    } catch (error) {
      this.onboardingError.set(error instanceof Error ? error.message : 'Unable to enable notifications.');
    } finally {
      this.isBusy.set(false);
    }
  }

  protected toggleDarkMode(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    this.themeService.setDark(next);
  }

  protected async installPwa(): Promise<void> {
    const prompt = this.installPrompt();

    if (!prompt) {
      this.dialogService.create({
        zTitle: 'Install WasteGrab',
        zDescription: 'To install WasteGrab on your device, open the browser menu and choose "Add to Home Screen" (iOS Safari: Share -> Add to Home Screen).',
        zOkText: 'Got it',
        zWidth: 'max-w-sm',
      });
      return;
    }

    await prompt.prompt();
    await prompt.userChoice;
    this.installPrompt.set(null);
  }

  protected async finishOnboarding(destination?: 'collectorPickups'): Promise<void> {
    if (this.isBusy()) {
      return;
    }

    this.isBusy.set(true);
    this.onboardingError.set(null);

    try {
      await firstValueFrom(this.authService.completeOnboarding());

      if (destination === 'collectorPickups') {
        await this.router.navigateByUrl(routePath(ROUTE_PATHS.collector.base, ROUTE_PATHS.collector.pickups));
      }
    } catch (error) {
      this.onboardingError.set(error instanceof Error ? error.message : 'Unable to complete onboarding.');
    } finally {
      this.isBusy.set(false);
    }
  }

  protected isIosSafari(): boolean {
    try {
      const ua = window.navigator.userAgent || '';
      const isiOS = /iPad|iPhone|iPod/.test(ua);
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
      return isiOS && isSafari;
    } catch {
      return false;
    }
  }

  private async loadOnboardingData(): Promise<void> {
    try {
      await firstValueFrom(this.notificationService.loadNotifications());
    } catch {
      // Notification loading is optional during onboarding.
    }
  }

  private moveToIndex(index: number): void {
    this.onboardingError.set(null);
    this.activeStep.set(this.steps[index]?.key ?? 'location');
  }
}
