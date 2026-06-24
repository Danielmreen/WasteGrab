import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

type BrandLogoSize = 'sm' | 'md' | 'lg';
type BrandLogoTone = 'default' | 'inverse' | 'sidebar';

const MARK_SIZE_CLASSES: Record<BrandLogoSize, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
};

const TEXT_SIZE_CLASSES: Record<BrandLogoSize, string> = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

@Component({
  selector: 'app-brand-logo',
  template: `
    <span class="inline-flex items-center gap-3 select-none pt-1">
      <img
        src="/brand/Logo icon.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
        [class]="markClasses()"
      />
      <span [class]="textClasses()">
        Waste<span [class]="accentClasses()">Grab</span>
      </span>
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLogoComponent {
  readonly size = input<BrandLogoSize>('md');
  readonly tone = input<BrandLogoTone>('default');

  protected readonly markClasses = computed(
    () => `${MARK_SIZE_CLASSES[this.size()]} shrink-0 object-contain`,
  );

  protected readonly textClasses = computed(() => {
    const colorClass =
      this.tone() === 'inverse' ? 'text-white' : 'text-foreground';

    return `${TEXT_SIZE_CLASSES[this.size()]} font-bold tracking-tight ${colorClass}`;
  });

  protected readonly accentClasses = computed(() =>
    this.tone() === 'inverse' ? 'text-teal-200' : 'text-primary',
  );
}
