import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { ZardDialogOptions } from '@/ui/zard/dialog/dialog.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import type { ZardDialogRef } from '@/ui/zard/dialog/dialog-ref';
import { ZardSheetService } from '@/ui/zard/sheet/sheet.service';
import type { ZardSheetRef } from '@/ui/zard/sheet/sheet-ref';

/**
 * Opens a confirmation/content popup as a bottom drawer (zard sheet) on mobile
 * and a centered dialog on desktop. Accepts the same options as
 * {@link ZardDialogService} so existing `dialogService.create(...)` call sites
 * work unchanged — just swap the injected token.
 */
@Injectable({ providedIn: 'root' })
export class ResponsiveDialogService {
  private readonly dialog = inject(ZardDialogService);
  private readonly sheet = inject(ZardSheetService);
  private readonly platformId = inject(PLATFORM_ID);

  create<T = unknown, U = unknown>(
    options: ZardDialogOptions<T, U>,
  ): ZardDialogRef<T> | ZardSheetRef<T> {
    // Component content relies on Z_MODAL_DATA injection, which the sheet does not
    // provide — keep those on the dialog. Only string/template content drawers.
    const isComponentContent = typeof options.zContent === 'function';

    if (this.isMobile() && !isComponentContent) {
      return this.sheet.create<T, U>({
        ...options,
        zContent: (options.zContent ?? '') as typeof options.zContent,
        zWidth: undefined,
        zSide: 'bottom',
        zCustomClasses: [
          'max-h-[90svh] overflow-y-auto rounded-t-2xl',
          options.zCustomClasses,
        ]
          .filter(Boolean)
          .join(' '),
      });
    }

    return this.dialog.create<T, U>(options);
  }

  private isMobile(): boolean {
    return (
      isPlatformBrowser(this.platformId) &&
      window.matchMedia('(max-width: 767px)').matches
    );
  }
}
