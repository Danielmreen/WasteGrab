import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBell,
  lucideBrain,
  lucideCamera,
  lucideCheckCircle2,
  lucideChevronRight,
  lucideClock3,
  lucideCoins,
  lucideCoffee,
  lucideCreditCard,
  lucideEdit3,
  lucideFacebook,
  lucideFileText,
  lucideFuel,
  lucideGift,
  lucideImage,
  lucideInstagram,
  lucideLayoutDashboard,
  lucideLeaf,
  lucideLinkedin,
  lucideLoaderCircle,
  lucideLogOut,
  lucideMapPin,
  lucideMenu,
  lucidePackage,
  lucidePackageCheck,
  lucidePlus,
  lucideRecycle,
  lucideScale,
  lucideSettings,
  lucideShield,
  lucideShoppingBag,
  lucideSmartphone,
  lucideSparkles,
  lucideStar,
  lucideTicket,
  lucideTrendingUp,
  lucideTrophy,
  lucideTruck,
  lucideTwitter,
  lucideUpload,
  lucideUsers,
  lucideUtensils,
  lucideX,
  lucideZap,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { BrandLogoComponent } from '@/ui/brand/brand-logo.component';
import { AppPanelComponent } from '@/ui/panel/panel.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import { CustomerVoucherCardComponent, type VoucherCardItem } from '@/pages/customer/_components/customer-voucher-card.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';

type NavLink = { href: string; label: string };
type QuickAction = { label: string; icon: string; primary?: boolean };
type PickupRow = { shortId: string; title: string; date: string; statusLabel: string; statusClass: string; statusIcon: string; weight: string; points: number };
type LeaderboardRow = { rank: number; name: string; initials: string; value: string; isYou?: boolean };
type FooterGroup = { title: string; links: Array<{ label: string; href: string }> };

@Component({
  selector: 'app-home-page',
  imports: [
    RouterLink,
    NgIcon,
    ZardButtonComponent,
    BrandLogoComponent,
    AppPanelComponent,
    StatGridComponent,
    CustomerVoucherCardComponent,
  ],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideArrowRight,
      lucideBell,
      lucideBrain,
      lucideCamera,
      lucideCheckCircle2,
      lucideChevronRight,
      lucideClock3,
      lucideCoins,
      lucideCoffee,
      lucideCreditCard,
      lucideEdit3,
      lucideFacebook,
      lucideFileText,
      lucideFuel,
      lucideGift,
      lucideImage,
      lucideInstagram,
      lucideLayoutDashboard,
      lucideLeaf,
      lucideLinkedin,
      lucideLoaderCircle,
      lucideLogOut,
      lucideMapPin,
      lucideMenu,
      lucidePackage,
      lucidePackageCheck,
      lucidePlus,
      lucideRecycle,
      lucideScale,
      lucideSettings,
      lucideShield,
      lucideShoppingBag,
      lucideSmartphone,
      lucideSparkles,
      lucideStar,
      lucideTicket,
      lucideTrendingUp,
      lucideTrophy,
      lucideTruck,
      lucideTwitter,
      lucideUpload,
      lucideUsers,
      lucideUtensils,
      lucideX,
      lucideZap,
    }),
  ],
})
export class HomePage implements OnInit {
  ngOnInit(): void {
    if (!this.authService.hasLoadedSession()) {
      this.authService.loadSession().subscribe();
    }
  }
  readonly mobileMenuOpen = signal(false);

  readonly navLinks: NavLink[] = [
    { href: '#preview', label: 'App Preview' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#rewards', label: 'Rewards' },
  ];

  readonly platformStats: StatCardItem[] = [
    { label: 'Active Users',       value: '50K+', icon: 'lucideUsers',   tone: 'brand', trend: { value: '+12%', label: 'this month',    direction: 'up' } },
    { label: 'Waste Collected',    value: '120',  unit: 'tonnes', icon: 'lucideRecycle', tone: 'brand', trend: { value: '+8%',  label: 'vs last month', direction: 'up' } },
    { label: 'Points Distributed', value: '2M+',  icon: 'lucideCoins',   tone: 'brand', trend: { value: '+21%', label: 'vs last month', direction: 'up' } },
    { label: 'Collector Partners', value: '340+', icon: 'lucideTruck',   tone: 'brand', trend: { value: '+5',   label: 'new this week', direction: 'up' } },
  ];

  readonly quickActions: QuickAction[] = [
    { label: 'Request pickup',   icon: 'lucidePlus',   primary: true },
    { label: 'Track requests',   icon: 'lucideTruck' },
    { label: 'Use rewards',      icon: 'lucideTicket' },
    { label: 'View leaderboard', icon: 'lucideTrophy' },
  ];

  readonly demoPickups: PickupRow[] = [
    { shortId: 'PKP-001', title: 'Plastic, Cardboard', date: 'Jun 10, 2026', statusLabel: 'Completed', statusClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', statusIcon: 'lucideCheckCircle2', weight: '3.2 kg', points: 320 },
    { shortId: 'PKP-002', title: 'Electronics, Metal', date: 'Jun 8, 2026', statusLabel: 'On The Way', statusClass: 'bg-primary/10 text-primary', statusIcon: 'lucideTruck', weight: '5.1 kg', points: 510 },
    { shortId: 'PKP-003', title: 'Glass, Paper', date: 'Jun 5, 2026', statusLabel: 'Completed', statusClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', statusIcon: 'lucideCheckCircle2', weight: '2.8 kg', points: 280 },
  ];

  readonly demoVouchers: VoucherCardItem[] = [
    { leftIcon: 'lucideCoffee', leftValue: 500, leftLabel: 'pts used', title: 'Coffee Voucher', badgeLabel: 'Expires Dec 2026', code: 'COFFEE500' },
    { leftIcon: 'lucideShoppingBag', leftValue: 1000, leftLabel: 'pts used', title: 'Shopping Credit', badgeLabel: 'Expires Nov 2026', code: 'SHOP1000' },
  ];

  readonly leaderboard: LeaderboardRow[] = [
    { rank: 1, name: 'Ahmad Faris', initials: 'AF', value: '9,840 pts' },
    { rank: 2, name: 'Nurul Ain', initials: 'NA', value: '8,120 pts' },
    { rank: 3, name: 'You', initials: 'YO', value: '7,650 pts', isYou: true },
    { rank: 4, name: 'Haziq Danial', initials: 'HD', value: '6,990 pts' },
    { rank: 5, name: 'Syafiqah', initials: 'SY', value: '5,430 pts' },
  ];

  readonly howItWorksSteps = [
    { step: '01', icon: 'lucideCamera',       title: 'Upload Waste Images', description: 'Snap photos of your recyclables — bottles, cardboard, cans. Multi-image upload supported.' },
    { step: '02', icon: 'lucideSparkles',     title: 'AI Analysis',         description: 'Our AI identifies waste types, estimates weight, calculates points, and flags hazardous materials.' },
    { step: '03', icon: 'lucideEdit3',        title: 'Review & Edit',       description: 'Check the AI results, adjust quantities, or add more items before submitting.' },
    { step: '04', icon: 'lucideCheckCircle2', title: 'Submit Request',      description: 'Confirm your pickup. Nearby verified collectors can accept and complete the collection.' },
    { step: '05', icon: 'lucideTruck',        title: 'Collector Arrives',   description: 'A collector comes to your location, verifies the waste, and completes the pickup.' },
    { step: '06', icon: 'lucideGift',         title: 'Earn Rewards',        description: 'Points land in your account based on verified weight. Redeem for food, shopping, or cashback.' },
  ];

  readonly features = [
    { icon: 'lucideCamera',       title: 'Easy Image Upload',    description: 'Snap a photo of your recyclables — multi-image support included.' },
    { icon: 'lucideBrain',        title: 'AI-Powered Detection', description: 'Instant waste identification, weight estimation, and points calculation.' },
    { icon: 'lucideMapPin',       title: 'Flexible Drop-Off',    description: 'Collectors bring verified recyclables to any available collection hub.' },
    { icon: 'lucideCoins',        title: 'Reward Points',        description: 'Every successful pickup earns points redeemable for real-world vouchers.' },
    { icon: 'lucideShield',       title: 'Hazard Detection',     description: 'AI flags dangerous materials for safe handling and proper disposal.' },
    { icon: 'lucideZap',          title: 'Real-Time Tracking',   description: 'Follow your pickup from submission to completion live in the app.' },
  ];

  readonly footerLinks: FooterGroup[] = [
    { title: 'Product', links: [{ label: 'App Preview', href: '#preview' }, { label: 'How It Works', href: '#how-it-works' }, { label: 'Features', href: '#features' }, { label: 'Rewards', href: '#rewards' }] },
    { title: 'Company', links: [{ label: 'About Us', href: '#' }, { label: 'Careers', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Press', href: '#' }] },
    { title: 'Support', links: [{ label: 'Help Center', href: '#' }, { label: 'Contact Us', href: '#' }, { label: 'Privacy Policy', href: '#' }, { label: 'Terms of Service', href: '#' }] },
  ];

  protected readonly authService = inject(AuthService);
  readonly sectionClass = computed(() =>
    this.authService.isAuthenticated() ? 'px-4 sm:px-6 lg:px-8' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'
  );
  readonly ctaRoute = computed(() => {
    const user = this.authService.currentUser();
    return user ? this.authService.getDefaultRouteForRole(user.role) : '/auth';
  });

  readonly sidebarNavItems = [
    { label: 'Dashboard', icon: 'lucideLayoutDashboard', active: true },
    { label: 'My Requests', icon: 'lucideTruck', active: false },
    { label: 'Vouchers', icon: 'lucideTicket', active: false },
    { label: 'Leaderboard', icon: 'lucideTrophy', active: false },
    { label: 'Achievements', icon: 'lucideStar', active: false },
  ];

  toggleMobileMenu(): void { this.mobileMenuOpen.update(v => !v); }
  closeMobileMenu(): void { this.mobileMenuOpen.set(false); }

  rankClass(rank: number): string {
    switch (rank) {
      case 1: return 'border border-amber-300 bg-linear-to-br from-amber-200 via-amber-400 to-yellow-600 text-amber-950 shadow-sm shadow-amber-500/30';
      case 2: return 'border border-slate-300 bg-linear-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-900 shadow-sm shadow-slate-400/30';
      case 3: return 'border border-orange-300 bg-linear-to-br from-orange-200 via-orange-400 to-amber-700 text-orange-950 shadow-sm shadow-orange-500/30';
      default: return 'border border-transparent bg-transparent text-muted-foreground';
    }
  }
}
