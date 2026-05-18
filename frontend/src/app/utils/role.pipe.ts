import { Pipe, PipeTransform } from '@angular/core';
import type { UserRole } from '@wastegrab/shared';

@Pipe({
  name: 'displayRole',
  standalone: true,
})
export class DisplayRolePipe implements PipeTransform {
  transform(value: UserRole): string {
    switch (value) {
      case 'ADMIN':
        return 'Admin';
      case 'COLLECTOR':
        return 'Collector';
      case 'CUSTOMER':
        return 'Customer';
      default:
        return value;
    }
  }
}

@Pipe({
  name: 'roleBadgeType',
  standalone: true,
})
export class RoleBadgeTypePipe implements PipeTransform {
  transform(role: UserRole): 'default' | 'secondary' | 'destructive' {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'COLLECTOR':
        return 'default';
      default:
        return 'secondary';
    }
  }
}
