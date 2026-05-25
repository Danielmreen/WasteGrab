import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppNavbarComponent } from '@/ui/navbar/navbar.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [AppNavbarComponent, RouterOutlet, NgClass],
  template: `
    <div class="h-dvh flex min-w-0 flex-col-reverse lg:grid" [ngClass]="authService.currentUser() ? 'lg:grid-cols-[16rem_minmax(0,1fr)]' : ''">
      @if (authService.currentUser()) {
        <app-navbar />
      }
      <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto" [ngClass]="authService.currentUser() ? 'lg:pb-0 bg-background m-2 rounded-2xl border-dashed border-2 border-border' : 'lg:pb-0 bg-muted'">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly authService = inject(AuthService);
}
