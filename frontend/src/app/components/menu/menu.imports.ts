import { ZardContextMenuDirective } from '@/components/menu/context-menu.directive';
import { ZardMenuContentDirective } from '@/components/menu/menu-content.directive';
import { ZardMenuItemDirective } from '@/components/menu/menu-item.directive';
import { ZardMenuLabelComponent } from '@/components/menu/menu-label.component';
import { ZardMenuShortcutComponent } from '@/components/menu/menu-shortcut.component';
import { ZardMenuDirective } from '@/components/menu/menu.directive';

export const ZardMenuImports = [
  ZardContextMenuDirective,
  ZardMenuContentDirective,
  ZardMenuItemDirective,
  ZardMenuDirective,
  ZardMenuLabelComponent,
  ZardMenuShortcutComponent,
] as const;
