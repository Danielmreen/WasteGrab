import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    @if (showEnvironmentBanner) {
      <div
        class="overscroll-none absolute top-0 z-100 w-full bg-red-600 text-white text-xs/4 font-bold  px-3 py-1 text-center uppercase animate-pulse"
      >
        Running on {{ environmentLabel }}
      </div>
    }

    <router-outlet />
  `,
})
export class App {
  protected readonly showEnvironmentBanner = environment.showEnvironmentBanner;
  protected readonly environmentLabel = environment.environmentLabel;
}
