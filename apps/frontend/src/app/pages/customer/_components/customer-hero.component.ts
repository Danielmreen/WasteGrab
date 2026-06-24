import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-customer-hero',
  standalone: true,
  template: `
    <header
      class="brand-hero card-lift relative min-w-0 overflow-hidden rounded-3xl p-5 lg:p-7"
    >
      <div
        class="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-white/10"
        aria-hidden="true"
      ></div>
      <div
        class="pointer-events-none absolute -bottom-16 right-16 size-36 rounded-full bg-white/5"
        aria-hidden="true"
      ></div>
      <p class="text-sm font-medium text-white/80">{{ greeting() }},</p>
      <h1 class="mt-1 truncate text-2xl font-bold tracking-tight lg:text-3xl">
        {{ customerName() }}
      </h1>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerHeroComponent {
  readonly customerName = input.required<string>();

  protected readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });
}
