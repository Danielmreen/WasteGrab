import { ZardDropdownMenuItemComponent } from '@/components/dropdown/dropdown-item.component';
import { ZardDropdownMenuContentComponent } from '@/components/dropdown/dropdown-menu-content.component';
import { ZardDropdownDirective } from '@/components/dropdown/dropdown-trigger.directive';
import { ZardDropdownMenuComponent } from '@/components/dropdown/dropdown.component';
import { ZardMenuLabelComponent } from '@/components/menu/menu-label.component';

export const ZardDropdownImports = [
  ZardDropdownMenuComponent,
  ZardDropdownMenuItemComponent,
  ZardMenuLabelComponent,
  ZardDropdownMenuContentComponent,
  ZardDropdownDirective,
] as const;
