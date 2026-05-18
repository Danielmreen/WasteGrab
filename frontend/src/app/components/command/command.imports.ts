import { ZardCommandDividerComponent } from '@/components/command/command-divider.component';
import { ZardCommandEmptyComponent } from '@/components/command/command-empty.component';
import { ZardCommandInputComponent } from '@/components/command/command-input.component';
import { ZardCommandListComponent } from '@/components/command/command-list.component';
import { ZardCommandOptionGroupComponent } from '@/components/command/command-option-group.component';
import { ZardCommandOptionComponent } from '@/components/command/command-option.component';
import { ZardCommandComponent } from '@/components/command/command.component';

export const ZardCommandImports = [
  ZardCommandComponent,
  ZardCommandInputComponent,
  ZardCommandListComponent,
  ZardCommandEmptyComponent,
  ZardCommandOptionComponent,
  ZardCommandOptionGroupComponent,
  ZardCommandDividerComponent,
] as const;
