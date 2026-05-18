import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-collector-page',
  templateUrl: './collector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorPage {}
