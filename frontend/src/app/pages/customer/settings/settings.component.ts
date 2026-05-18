import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AuthService } from '@/services/auth.service';
import { ThemeService } from '@/services/theme.service';
import { ZardButtonComponent } from '@/components/button/button.component';
import { AppHeaderComponent } from '@/components/header/header.component';

@Component({
  selector: 'app-settings-page',
  imports: [ZardButtonComponent, AppHeaderComponent],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  protected notifications = true;
  protected emailUpdates = false;
  protected darkMode = false;

  ngOnInit(): void {
    if (!this.authService.hasLoadedSession()) {
      void this.authService.loadSession().subscribe();
    }
    // initialize dark mode from persisted preference or system
    this.darkMode = this.themeService.isDark();
  }

  toggleNotifications(): void {
    this.notifications = !this.notifications;
  }

  toggleEmailUpdates(): void {
    this.emailUpdates = !this.emailUpdates;
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.themeService.setDark(this.darkMode);
  }

  saveSettings(): void {
    // TODO: Implement settings save logic
    console.log('Settings saved', {
      notifications: this.notifications,
      emailUpdates: this.emailUpdates,
      darkMode: this.darkMode,
    });
  }
}
