import { ZardTreeNodeContentComponent } from '@/components/tree/tree-node-content.component';
import { ZardTreeNodeToggleDirective } from '@/components/tree/tree-node-toggle.directive';
import { ZardTreeNodeComponent } from '@/components/tree/tree-node.component';
import { ZardTreeComponent } from '@/components/tree/tree.component';

export const ZardTreeImports = [
  ZardTreeComponent,
  ZardTreeNodeComponent,
  ZardTreeNodeToggleDirective,
  ZardTreeNodeContentComponent,
] as const;
