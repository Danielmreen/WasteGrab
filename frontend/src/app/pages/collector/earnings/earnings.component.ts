import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppHeaderComponent } from '@/components/header/header.component';

@Component({
  selector: 'app-collector-earnings-page',
  templateUrl: './earnings.html',
  imports: [AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorEarningsPage {}
