import { ContentComponent } from '@/components/layout/content.component';
import { FooterComponent } from '@/components/layout/footer.component';
import { LayoutComponent } from '@/components/layout/layout.component';
import {
  SidebarComponent,
  SidebarGroupComponent,
  SidebarGroupLabelComponent,
} from '@/components/layout/sidebar.component';

export const LayoutImports = [
  LayoutComponent,
  FooterComponent,
  ContentComponent,
  SidebarComponent,
  SidebarGroupComponent,
  SidebarGroupLabelComponent,
] as const;
