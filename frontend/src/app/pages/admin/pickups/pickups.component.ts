import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppHeaderComponent } from '@/components/header/header.component';

@Component({
  selector: 'app-admin-pickups-page',
  templateUrl: './pickups.html',
  imports: [AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPickupsPage {}
