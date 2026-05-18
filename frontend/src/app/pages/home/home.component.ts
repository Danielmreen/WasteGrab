import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertTriangle,
  lucideArrowRight,
  lucideBell,
  lucideBrain,
  lucideCamera,
  lucideCheckCircle2,
  lucideChevronRight,
  lucideCoins,
  lucideCreditCard,
  lucideEdit3,
  lucideFacebook,
  lucideFuel,
  lucideGift,
  lucideHistory,
  lucideInstagram,
  lucideLeaf,
  lucideLinkedin,
  lucideMapPin,
  lucideMenu,
  lucidePlus,
  lucideRecycle,
  lucideScale,
  lucideSettings,
  lucideShoppingBag,
  lucideSparkles,
  lucideStar,
  lucideTruck,
  lucideTwitter,
  lucideUpload,
  lucideUser,
  lucideX,
  lucideZap,
  lucideCoffee,
  lucidePackage,
  lucideClock3,
  lucideShield,
  lucideUtensils,
  lucideSmartphone,
  lucideLayoutDashboard,
  lucideTrendingUp,
  lucideLogOut,
  lucideCircleCheck,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/components/button/button.component';

type NavLink = {
  href: string;
  label: string;
};

type Stat = {
  value: string;
  label: string;
};

type Step = {
  step: string;
  icon: string;
  title: string;
  description: string;
};

type Feature = {
  icon: string;
  title: string;
  description: string;
  accentClass: string;
};

type DetectedItem = {
  id: string;
  category: string;
  estimatedWeight: number;
  pricePerKg: number;
  confidence: number;
};

type DashboardStat = {
  label: string;
  value: string;
  icon: string;
  accentClass: string;
};

type Pickup = {
  id: string;
  date: string;
  status: 'completed' | 'on_the_way' | 'pending' | 'accepted';
  items: string;
  weight: string;
  points: number;
};

type TrackerStatus = {
  id: string;
  label: string;
  icon: string;
  completed: boolean;
  active?: boolean;
  time?: string;
};

type Voucher = {
  icon: string;
  name: string;
  points: number;
  value: string;
  partner: string;
  popular: boolean;
};

type FooterGroup = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ZardButtonComponent, NgIcon],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideAlertTriangle,
      lucideArrowRight,
      lucideBell,
      lucideBrain,
      lucideCamera,
      lucideCheckCircle2,
      lucideChevronRight,
      lucideCoins,
      lucideCreditCard,
      lucideEdit3,
      lucideFacebook,
      lucideFuel,
      lucideGift,
      lucideHistory,
      lucideInstagram,
      lucideLeaf,
      lucideLinkedin,
      lucideMapPin,
      lucideMenu,
      lucidePlus,
      lucideRecycle,
      lucideScale,
      lucideSettings,
      lucideShoppingBag,
      lucideSparkles,
      lucideStar,
      lucideTruck,
      lucideTwitter,
      lucideUpload,
      lucideUser,
      lucideX,
      lucideZap,
      lucideCoffee,
      lucidePackage,
      lucideClock3,
      lucideShield,
      lucideUtensils,
      lucideSmartphone,
      lucideLayoutDashboard,
      lucideTrendingUp,
      lucideLogOut,
      lucideCircleCheck,
    }),
  ],
})
export class HomePage {
  readonly mobileMenuOpen = signal(false);

  readonly navLinks: NavLink[] = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#rewards', label: 'Rewards' },
    { href: '#about', label: 'About' },
  ];

  readonly heroStats: Stat[] = [
    { value: '50K+', label: 'Active Users' },
    { value: '120T', label: 'Waste Collected' },
    { value: 'RM 2M+', label: 'Rewards Given' },
  ];

  readonly heroSteps: Step[] = [
    { step: '01', icon: 'lucideUpload', title: 'Upload Photo', description: 'Take a picture of your recyclables and upload it to our app.' },
    { step: '02', icon: 'lucideSparkles', title: 'AI Detection', description: 'Our AI instantly identifies materials and estimates value.' },
    { step: '03', icon: 'lucideTruck', title: 'Free Pickup', description: 'Schedule a convenient pickup time at your location.' },
    { step: '04', icon: 'lucideGift', title: 'Earn Rewards', description: 'Get points for every pickup and redeem vouchers.' },
  ];

  readonly howItWorksSteps: Step[] = [
    { step: '01', icon: 'lucideCamera', title: 'Upload Waste Images', description: 'Take photos of your recyclable materials - plastic bottles, cardboard, electronics, or anything else you want to recycle.' },
    { step: '02', icon: 'lucideSparkles', title: 'AI Analysis', description: 'Our AI instantly identifies the type of waste, estimates weight, calculates value, and detects any hazardous materials.' },
    { step: '03', icon: 'lucideEdit3', title: 'Review & Edit', description: 'Review the AI-generated details. You can edit quantities, add more items, or adjust the pickup location.' },
    { step: '04', icon: 'lucideCheckCircle2', title: 'Submit Request', description: 'Confirm your pickup request. The system automatically assigns a collector in your service area.' },
    { step: '05', icon: 'lucideTruck', title: 'Collector Pickup', description: 'A verified collector arrives at your location, verifies the waste, and completes the collection.' },
    { step: '06', icon: 'lucideGift', title: 'Earn Rewards', description: 'Receive reward points based on the verified weight and type of recyclables. Redeem for vouchers!' },
  ];

  readonly featureCards: Feature[] = [
    { icon: 'lucideCamera', title: 'Easy Image Upload', description: 'Simply snap a photo of your recyclables. Support for multiple images per request.', accentClass: 'bg-primary/10 text-primary' },
    { icon: 'lucideBrain', title: 'AI-Powered Detection', description: 'Our AI automatically identifies waste types, estimates weight, and calculates value.', accentClass: 'bg-accent/20 text-accent-foreground' },
    { icon: 'lucideMapPin', title: 'Location-Based Service', description: 'Collectors in your service area receive your request for quick response times.', accentClass: 'bg-primary/10 text-primary' },
    { icon: 'lucideCoins', title: 'Reward Points System', description: 'Earn points for every successful pickup. Redeem for food, shopping, or cashback vouchers.', accentClass: 'bg-accent/20 text-accent-foreground' },
    { icon: 'lucideShield', title: 'Hazard Detection', description: 'AI flags potentially hazardous materials to ensure safe handling and disposal.', accentClass: 'bg-primary/10 text-primary' },
    { icon: 'lucideZap', title: 'Real-Time Tracking', description: 'Track your pickup request status from submission to completion.', accentClass: 'bg-accent/20 text-accent-foreground' },
  ];

  readonly detectedItems: DetectedItem[] = [
    { id: '1', category: 'Plastic Bottles (PET)', estimatedWeight: 2.5, pricePerKg: 0.8, confidence: 94 },
    { id: '2', category: 'Cardboard', estimatedWeight: 1.2, pricePerKg: 0.3, confidence: 88 },
    { id: '3', category: 'Aluminum Cans', estimatedWeight: 0.8, pricePerKg: 3.5, confidence: 91 },
  ];

  readonly dashboardStats: DashboardStat[] = [
    { label: 'Total Pickups', value: '24', icon: 'lucidePackage', accentClass: 'bg-primary/10 text-primary' },
    { label: 'Total Weight', value: '128.5 kg', icon: 'lucideTrendingUp', accentClass: 'bg-accent/20 text-accent-foreground' },
    { label: 'Reward Points', value: '12,850', icon: 'lucideGift', accentClass: 'bg-primary/10 text-primary' },
    { label: 'Total Earned', value: 'RM 128.50', icon: 'lucideRecycle', accentClass: 'bg-accent/20 text-accent-foreground' },
  ];

  readonly recentPickups: Pickup[] = [
    { id: 'PKP-001', date: 'May 10, 2026', status: 'completed', items: 'Plastic, Cardboard', weight: '3.2 kg', points: 320 },
    { id: 'PKP-002', date: 'May 8, 2026', status: 'completed', items: 'Electronics, Metal', weight: '5.1 kg', points: 510 },
    { id: 'PKP-003', date: 'May 12, 2026', status: 'on_the_way', items: 'Glass, Paper', weight: '2.8 kg', points: 280 },
  ];

  readonly trackerStatuses: TrackerStatus[] = [
    { id: 'pending', label: 'Request Submitted', icon: 'lucideClock3', completed: true, time: '10:30 AM' },
    { id: 'accepted', label: 'Collector Accepted', icon: 'lucideCheckCircle2', completed: true, time: '10:45 AM' },
    { id: 'on_the_way', label: 'Collector On The Way', icon: 'lucideTruck', completed: true, time: '11:00 AM' },
    { id: 'arrived', label: 'Collector Arrived', icon: 'lucidePackage', completed: false, active: true },
    { id: 'verified', label: 'Waste Verified', icon: 'lucideCheckCircle2', completed: false },
    { id: 'completed', label: 'Pickup Complete', icon: 'lucideStar', completed: false },
  ];

  readonly vouchers: Voucher[] = [
    { icon: 'lucideCoffee', name: 'Coffee Voucher', points: 500, value: 'RM 5', partner: 'Starbucks', popular: true },
    { icon: 'lucideShoppingBag', name: 'Shopping Credit', points: 1000, value: 'RM 10', partner: 'Shopee', popular: false },
    { icon: 'lucideUtensils', name: 'Food Voucher', points: 800, value: 'RM 8', partner: 'GrabFood', popular: true },
    { icon: 'lucideCreditCard', name: 'Cashback', points: 2000, value: 'RM 20', partner: 'Touch n Go', popular: false },
    { icon: 'lucideFuel', name: 'Fuel Rebate', points: 1500, value: 'RM 15', partner: 'Petronas', popular: false },
    { icon: 'lucideSmartphone', name: 'Phone Credit', points: 1200, value: 'RM 12', partner: 'Hotlink', popular: false },
  ];

  readonly footerLinks: FooterGroup[] = [
    {
      title: 'Product',
      links: [
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Features', href: '#features' },
        { label: 'Rewards', href: '#rewards' },
        { label: 'Demo', href: '/auth' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Careers', href: '#about' },
        { label: 'Blog', href: '#features' },
        { label: 'Press', href: '#features' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '#contact' },
        { label: 'Contact Us', href: '#contact' },
        { label: 'Privacy Policy', href: '#about' },
        { label: 'Terms of Service', href: '#about' },
      ],
    },
  ];

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(value => !value);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  get totalWeight(): number {
    return this.detectedItems.reduce((sum, item) => sum + item.estimatedWeight, 0);
  }

  get totalValue(): number {
    return this.detectedItems.reduce((sum, item) => sum + item.estimatedWeight * item.pricePerKg, 0);
  }

  get totalPoints(): number {
    return Math.round(this.totalValue * 100);
  }
}
