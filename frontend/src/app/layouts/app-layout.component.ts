import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppNavbarComponent } from '@/components/navbar/navbar.component';
import { AuthService } from '@/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [AppNavbarComponent, RouterOutlet, NgClass],
  template: `
    <div class="h-dvh flex flex-col-reverse lg:grid" [ngClass]="authService.currentUser() ? 'lg:grid-cols-[16rem_1fr]' : ''">
      @if (authService.currentUser()) {
        <app-navbar />
      }
      <main class="flex-1 overflow-y-auto flex flex-col min-h-0" [ngClass]="authService.currentUser() ? 'lg:pb-0 bg-orange-50 m-2 rounded-2xl border-dashed border-2 border-slate-300' : 'lg:pb-0 bg-slate-50'">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly authService = inject(AuthService);
}
