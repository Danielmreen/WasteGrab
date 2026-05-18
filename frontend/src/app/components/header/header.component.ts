import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnInit,
  inject,
  Input,
  signal,
} from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
} from '@angular/router';

import { filter } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBell, lucideUser, lucideSettings, lucideLogOut } from '@ng-icons/lucide';

import { ZardBadgeComponent } from '@/components/badge/badge.component';
import { ZardButtonComponent } from '@/components/button/button.component';
import { ZardDialogService } from '@/components/dialog/dialog.service';
import {
  ZardDropdownDirective,
  ZardDropdownMenuContentComponent,
  ZardDropdownMenuItemComponent,
} from '@/components/dropdown';

import { AuthService } from '@/services/auth.service';

type NotificationItem = {
  title: string;
  message: string;
  time: string;
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardDropdownDirective,
    ZardDropdownMenuContentComponent,
    ZardDropdownMenuItemComponent,
    NgIcon,
  ],
  template: `
    <header class="flex items-center justify-between pointer-events-auto">

      <!-- LEFT SIDE -->
      <div class="">

        @if (mode === 'welcome') {

          @if (authService.currentUser(); as user) {
            <h1 class="text-2xl font-bold text-foreground">
              Welcome back, {{ user.name }}! 👋
            </h1>
          } @else {
            <h1 class="text-2xl font-bold text-foreground">
              Welcome! 👋
            </h1>
          }

        } @else {

          <h1 class="text-2xl font-bold text-foreground">
            {{ activeRouteTitle }}
          </h1>

        }

        <!-- ✨ ANIMATED QUOTE -->
        <p class="text-sm text-muted-foreground mt-1 min-h-6 leading-relaxed">

          @for (word of visibleWords(); track $index) {
            <span class="inline-block mr-1 animate-wordFade">
              {{ word }}
            </span>
          }

        </p>

      </div>

      <!-- RIGHT SIDE -->
      <div class="flex items-center gap-2 shrink-0">
        <ng-content select="[rightSide]" />

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

          <z-badge
            zType="default"
            zShape="pill"
            class="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-semibold leading-none shadow-sm pointer-events-none"
          >
            3
          </z-badge>
        </button>
      </div>

      <z-dropdown-menu-content #notificationMenu="zDropdownMenuContent" class="w-80 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl">
        <div class="border-b border-border px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-foreground">Notifications</p>
              <p class="text-xs text-slate-500">
                @if (notificationCount() > 0) {
                  {{ notificationCount() }} updates waiting for you
                } @else {
                  No updates right now
                }
              </p>
            </div>

            <button
              type="button"
              class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
              (click)="clearNotifications()"
            >
              Clear all
            </button>
          </div>
        </div>

        @if (notificationCount() > 0) {
          <div class="max-h-72 divide-y divide-slate-100 overflow-y-auto">
            @for (item of notificationItems(); track item.title) {
              <button
                z-dropdown-menu-item
                type="button"
                class="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <span class="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-500"></span>

                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-slate-900">{{ item.title }}</span>
                  <span class="mt-0.5 block text-xs leading-5 text-slate-500">{{ item.message }}</span>
                  <span class="mt-1 block text-[11px] text-slate-400">{{ item.time }}</span>
                </span>
              </button>
            }
          </div>
        } @else {
          <div class="px-4 py-8 text-center">
            <p class="text-sm font-medium text-slate-900">You're all caught up.</p>
            <p class="mt-1 text-xs text-slate-500">New notifications will appear here.</p>
          </div>
        }
      </z-dropdown-menu-content>

    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ lucideBell, lucideUser, lucideSettings, lucideLogOut })],
})
export class AppHeaderComponent implements OnInit {
  @Input() mode: 'welcome' | 'route' = 'welcome';

  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly dialogService = inject(ZardDialogService);

  protected readonly notificationItems = signal<NotificationItem[]>([
    {
      title: 'Pickup request approved',
      message: 'Your waste pickup has been scheduled for tomorrow morning.',
      time: '5 minutes ago',
    },
    {
      title: 'Collector assigned',
      message: 'A collector is now assigned to your latest request.',
      time: '1 hour ago',
    },
    {
      title: 'Voucher redeemed',
      message: 'Your reward voucher was successfully redeemed.',
      time: 'Today, 9:20 AM',
    },
  ]);

  protected readonly notificationCount = computed(() => this.notificationItems().length);

  // -----------------------------
  // ROUTE TITLE
  // -----------------------------
  activeRouteTitle = '';

  // -----------------------------
  // QUOTES STATE
  // -----------------------------
  private quotes = [
    "Let's make our environment cleaner together.",
    'Every piece of waste recycled makes a difference.',
    'Together we can build a sustainable future.',
    "Reduce, reuse, recycle – that's the way.",
    'Your actions today shape tomorrow\'s world.',
    'Make waste management easy and rewarding.',
    'Join the movement towards zero waste.',
    'Small steps lead to big environmental changes.',
  ];

  visibleWords = signal<string[]>([]);

  // -----------------------------
  // INIT
  // -----------------------------
  ngOnInit(): void {
    if (!this.authService.hasLoadedSession()) {
      void this.authService.loadSession().subscribe();
    }

    this.updateRouteTitle();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateRouteTitle();
      });

    this.playQuoteAnimation();

    setInterval(() => {
      this.playQuoteAnimation();
    }, 7000);
  }

  // -----------------------------
  // MAIN ANIMATION (FIXED)
  // -----------------------------
  private playQuoteAnimation(): void {
    const newQuote = this.getRandomQuote();
    const newWords = newQuote.split(' ');

    // STEP 1: fade OUT old words (smooth shrink)
    const current = [...this.visibleWords()];
    let i = current.length;

    const fadeOut = setInterval(() => {
      if (i <= 0) {
        clearInterval(fadeOut);

        // STEP 2: reset then animate in new words
        this.visibleWords.set([]);
        this.animateWordsIn(newWords);
        return;
      }

      i--;
      this.visibleWords.set(current.slice(0, i));
    }, 50);
  }

  // STEP 3: animate IN words
  private animateWordsIn(words: string[]): void {
    let index = 0;

    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        return;
      }

      this.visibleWords.update(v => [...v, words[index]]);
      index++;
    }, 160);
  }

  // -----------------------------
  // ROUTE TITLE
  // -----------------------------
  private updateRouteTitle(): void {
    let r = this.route;

    while (r.firstChild) {
      r = r.firstChild;
    }

    this.activeRouteTitle =
      r.snapshot.data?.['title'] ?? 'Untitled Page';
  }

  // -----------------------------
  // HELPERS
  // -----------------------------
  private getRandomQuote(): string {
    return this.quotes[
      Math.floor(Math.random() * this.quotes.length)
    ];
  }

  // -----------------------------
  // NAVIGATION
  // -----------------------------
  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  goToSettings(): void {
    void this.router.navigate(['/settings']);
  }

  protected clearNotifications(): void {
    this.notificationItems.set([]);
  }

  // -----------------------------
  // LOGOUT
  // -----------------------------
  confirmLogout(): void {
    this.dialogService.create({
      zTitle: 'Confirm Logout',
      zDescription: 'Are you sure you want to logout?',
      zOkText: 'Logout',
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',

      zOnOk: () => {
        void this.authService.logout().subscribe({
          next: () => void this.router.navigate(['/auth']),
          error: () => void this.router.navigate(['/auth']),
        });
      },
    });
  }
}