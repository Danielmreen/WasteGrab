import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLeaf } from '@ng-icons/lucide';

import { HEADER_QUOTES } from './header-quotes';

@Component({
  selector: 'app-header-quote',
  standalone: true,
  imports: [NgIcon],
  template: `
    <p
      class="mt-1 flex min-h-6 min-w-0 max-w-full items-center gap-1 overflow-hidden text-[0.70rem]/relaxed text-primary lg:text-sm/relaxed"
    >
      <ng-icon name="lucideLeaf" class="size-4!" />
      <span>"</span>
      @for (word of visibleWords(); track $index) {
        <span class="inline-block animate-wordFade">
          {{ word }}
        </span>
      }
      <span>"</span>
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ lucideLeaf })],
})
export class AppHeaderQuoteComponent implements OnInit, OnDestroy {
  protected readonly visibleWords = signal<string[]>([]);

  private quoteInterval?: number;
  private fadeInterval?: number;
  private wordInterval?: number;

  ngOnInit(): void {
    this.playQuoteAnimation();

    this.quoteInterval = window.setInterval(() => {
      this.playQuoteAnimation();
    }, 7000);
  }

  ngOnDestroy(): void {
    this.clearAnimationIntervals();
  }

  private playQuoteAnimation(): void {
    this.clearWordTransitions();

    const newWords = this.getRandomQuote().split(' ');
    const current = [...this.visibleWords()];
    let i = current.length;

    this.fadeInterval = window.setInterval(() => {
      if (i <= 0) {
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
        }

        this.visibleWords.set([]);
        this.animateWordsIn(newWords);
        return;
      }

      i--;
      this.visibleWords.set(current.slice(0, i));
    }, 50);
  }

  private animateWordsIn(words: string[]): void {
    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }

    let index = 0;

    this.wordInterval = window.setInterval(() => {
      if (index >= words.length) {
        if (this.wordInterval) {
          clearInterval(this.wordInterval);
        }

        return;
      }

      this.visibleWords.update((value) => [...value, words[index]]);
      index++;
    }, 160);
  }

  private clearWordTransitions(): void {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }
  }

  private clearAnimationIntervals(): void {
    if (this.quoteInterval) {
      clearInterval(this.quoteInterval);
    }

    this.clearWordTransitions();
  }

  private getRandomQuote(): string {
    return HEADER_QUOTES[Math.floor(Math.random() * HEADER_QUOTES.length)];
  }
}
