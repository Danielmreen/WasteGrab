import { inject, Injectable } from '@angular/core';

const STORAGE_KEY = 'wastegrab-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = typeof document !== 'undefined' ? document.documentElement : null;

  isDark(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      if (typeof window === 'undefined') return false;
      const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      return !!mq?.matches;
    } catch {
      return false;
    }
  }

  setDark(value: boolean): void {
    try {
      if (!this.doc) return;
      if (value) {
        this.doc.classList.add('dark');
        localStorage.setItem(STORAGE_KEY, 'dark');
      } else {
        this.doc.classList.remove('dark');
        localStorage.setItem(STORAGE_KEY, 'light');
      }
    } catch {
      // ignore
    }
  }

  toggle(): void {
    this.setDark(!this.isDark());
  }
}
