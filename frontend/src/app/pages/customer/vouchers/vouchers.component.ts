import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppHeaderComponent } from '@/components/header/header.component';

@Component({
  selector: 'app-customer-vouchers-page',
  templateUrl: './vouchers.html',
  imports: [AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerVouchersPage {}
