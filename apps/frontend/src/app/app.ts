import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

const SPLASH_SESSION_KEY = 'wastegrab-splash-seen';
const SPLASH_DURATION_MS = 1400;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (showSplash()) {
      <div class="fixed inset-0 z-100 flex items-center justify-center bg-background text-foreground">
        <div class="grid justify-items-center gap-5 px-6 text-center">
          <div class="flex h-18 w-18 items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-primary-foreground shadow-lg">
            W
          </div>

          <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-normal">WasteGrab</h1>
            <p class="text-sm text-muted-foreground">Loading your workspace</p>
          </div>

          <div class="h-1 w-40 overflow-hidden rounded-full bg-muted">
            <div class="h-full w-1/2 animate-splash-progress rounded-full bg-primary"></div>
          </div>
        </div>
      </div>
    }

    @if (showEnvironmentBanner) {
      <div class="absolute top-0 z-90 w-full bg-red-600 text-white text-xs font-bold leading-4 px-3 py-1 text-center uppercase animate-pulse">
        Running on {{ environmentLabel }}
      </div>
    }

    <router-outlet />
  `,
})
export class App {
  protected readonly showEnvironmentBanner = environment.showEnvironmentBanner;
  protected readonly environmentLabel = environment.environmentLabel;
  protected readonly showSplash = signal(shouldShowSplash());

  constructor() {
    if (!this.showSplash()) {
      return;
    }

    window.setTimeout(() => {
      markSplashSeen();
      this.showSplash.set(false);
    }, SPLASH_DURATION_MS);
  }
}

function shouldShowSplash(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SESSION_KEY) !== 'true';
  } catch {
    return false;
  }
}

function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SESSION_KEY, 'true');
  } catch {
    // Ignore storage failures.
  }
}
