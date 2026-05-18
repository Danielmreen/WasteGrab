import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppHeaderComponent } from '@/components/header/header.component';

@Component({
  selector: 'app-collector-pickups-page',
  templateUrl: './pickups.html',
  imports: [AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorPickupsPage {}
