import { AppHeaderComponent } from '@/components/header/header.component';
import { A } from '@angular/cdk/keycodes';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-rewards-page',
  templateUrl: './rewards.html',
  imports: [AppHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RewardsPage {}
