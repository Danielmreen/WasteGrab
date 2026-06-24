import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideTrash2 } from '@ng-icons/lucide';

import { ZardBadgeComponent } from '@/ui/zard/badge/badge.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import {
  ZardDropdownDirective,
  ZardDropdownMenuContentComponent,
  ZardDropdownMenuItemComponent,
} from '@/ui/zard/dropdown';

import { AuthService } from '@/services/auth.service';
import { NotificationService } from '@/services/notification.service';
import { NotificationMarkdownPipe } from '@/utils/notification-markdown.pipe';
import type { Notification } from '@wastegrab/shared';

@Component({
  selector: 'app-header-notifications',
  standalone: true,
  imports: [
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardDropdownDirective,
    ZardDropdownMenuContentComponent,
    ZardDropdownMenuItemComponent,
    NotificationMarkdownPipe,
    NgIcon,
  ],
  template: `
    <button
      z-button
      #notificationTrigger
      zDropdown
      [zDropdownMenu]="notificationMenu"
      zTrigger="click"
      type="button"
      zType="outline"
      zSize="icon"
      zShape="circle"
      class="relative"
      aria-label="Notifications"
    >
      <ng-icon name="lucideBell" class="size-5!" />

      @if (notificationCount() > 0) {
        <z-badge
          zType="default"
          zShape="pill"
          class="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-semibold leading-none shadow-sm pointer-events-none"
        >
          {{ notificationCount() }}
        </z-badge>
      }
    </button>

    <z-dropdown-menu-content
      #notificationMenu="zDropdownMenuContent"
      class="w-80 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl"
    >
      <div class="border-b border-border px-4 py-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-foreground">Notifications</p>
            <p class="text-xs text-muted-foreground">
              @if (notificationCount() > 0) {
                {{ notificationCount() }} updates waiting for you
              } @else {
                No updates right now
              }
            </p>
          </div>

          <button
            type="button"
            class="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            (click)="markAllNotificationsRead()"
          >
            Mark read
          </button>
        </div>
        @if (notificationItems().length > 0) {
          <button
            type="button"
            class="mt-3 w-full rounded-full border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
            (click)="clearAllNotifications($event)"
          >
            Clear notifications
          </button>
        }
        @if (notificationService.canEnablePush()) {
          <button
            type="button"
            class="mt-3 w-full rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
            (click)="enablePushNotifications()"
          >
            Enable device notifications
          </button>
        }
      </div>

      @if (notificationItems().length > 0) {
        <div class="max-h-72 divide-y divide-border overflow-y-auto">
          @for (item of notificationItems(); track item.id) {
            <button
              z-dropdown-menu-item
              type="button"
              class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
              (click)="openNotification(item)"
            >
              <span
                class="mt-1 size-2.5 rounded-full"
                [class.bg-primary]="!item.readAt"
                [class.bg-muted-foreground/30]="item.readAt"
              ></span>

              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-foreground">{{
                  item.title
                }}</span>
                <span
                  class="mt-0.5 block text-xs/5 text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_em]:italic [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p+p]:mt-1 [&_strong]:font-semibold [&_ul]:mt-1"
                  [innerHTML]="item.message | notificationMarkdown"
                ></span>
                <span class="mt-1 block text-[11px] text-muted-foreground/70">
                  {{ notificationTime(item) }}
                </span>
              </span>

              @if (item.isClearable) {
                <button
                  type="button"
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Clear notification"
                  (click)="clearNotification($event, item)"
                >
                  <ng-icon name="lucideTrash2" class="size-4!" />
                </button>
              } @else {
                <span
                  class="mt-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  Pinned
                </span>
              }
            </button>
          }
        </div>
      } @else {
        <div class="px-4 py-8 text-center">
          <p class="text-sm font-medium text-foreground">
            You're all caught up.
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            New notifications will appear here.
          </p>
        </div>
      }
    </z-dropdown-menu-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ lucideBell, lucideTrash2 })],
})
export class AppHeaderNotificationsComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly notificationService = inject(NotificationService);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly notificationItems = computed(() =>
    this.notificationService.notifications(),
  );
  protected readonly notificationCount = computed(() =>
    this.notificationService.unreadCount(),
  );

  ngOnInit(): void {
    if (!this.authService.hasLoadedSession()) {
      void this.authService.loadSession().subscribe({
        next: () => this.loadNotifications(),
      });
    } else {
      this.loadNotifications();
    }
  }

  ngOnDestroy(): void {
    this.notificationService.stopRealtime();
  }

  protected markAllNotificationsRead(): void {
    void this.notificationService.markAllRead().subscribe();
  }

  protected clearAllNotifications(event: Event): void {
    event.stopPropagation();
    void this.notificationService.clearAllNotifications().subscribe();
  }

  protected clearNotification(event: Event, notification: Notification): void {
    event.stopPropagation();
    void this.notificationService.clearNotification(notification).subscribe();
  }

  protected openNotification(notification: Notification): void {
    this.notificationService.markRead(notification);
  }

  protected enablePushNotifications(): void {
    void this.notificationService
      .enablePushNotifications()
      .then(() => {
        this.dialogService.create({
          zTitle: 'Notifications enabled',
          zDescription: 'This device will receive WasteGrab updates.',
          zOkText: 'Done',
          zWidth: 'max-w-sm',
        });
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to enable device notifications.';
        this.dialogService.create({
          zTitle: 'Notifications unavailable',
          zDescription: message,
          zOkText: 'OK',
          zWidth: 'max-w-sm',
        });
      });
  }

  protected notificationTime(notification: Notification): string {
    return new Date(notification.createdAt).toLocaleString();
  }

  private loadNotifications(): void {
    if (!this.authService.currentUser()) {
      return;
    }

    this.notificationService.startRealtime();
  }
}
