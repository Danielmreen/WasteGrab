import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AppHeaderComponent } from '@/components/header/header.component';
import { ZardTableImports } from '@/components/table';
import { ZardButtonComponent } from '@/components/button/button.component';
import { ZardModalComponent } from '@/components/modal/modal.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/components/form/form.component';
import { ZardInputDirective } from '@/components/input';
import { ZardSelectImports } from '@/components/select/select.imports';
import { ZardDialogService } from '@/components/dialog/dialog.service';
import { LocationService, type LocationRecord } from '@/services/location.service';
import { UserService } from '@/services/user.service';
import type { User } from '@wastegrab/shared';

type LocationModalMode = 'add' | 'assign' | 'edit' | null;

@Component({
  selector: 'app-admin-collectors-page',
  templateUrl: './collectors.html',
  imports: [
    ReactiveFormsModule,
    AppHeaderComponent,
    ...ZardTableImports,
    ZardButtonComponent,
    ...ZardSelectImports,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCollectorsPage implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly locations = signal<LocationRecord[]>([]);
  protected readonly collectorsList = signal<User[]>([]);
  protected readonly availableCollectors = computed(() => {
    const locId = this.editingLocationId();
    const all = this.collectorsList();
    if (!locId) return all;

    const loc = this.locations().find(l => l.id === locId);
    const assignedIds = new Set((loc?.collectors ?? []).map((c: any) => c.collector.id));
    return all.filter(u => !assignedIds.has(u.id));
  });
  protected readonly modalMode = signal<LocationModalMode>(null);
  protected readonly editingLocationId = signal<string | null>(null);

  protected readonly createForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    address: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
  });

  protected readonly assignForm = new FormGroup({
    collectorId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly userService = inject(UserService);

  ngOnInit(): void {
    this.loadLocations();
    this.loadCollectors();
  }

  private loadLocations(): void {
    this.locationService.listLocations().subscribe({ next: (list) => this.locations.set(list), error: () => this.locations.set([]) });
  }

  private loadCollectors(): void {
    this.userService.listUsers().subscribe({ next: (list) => this.collectorsList.set(list.filter(u => u.role === 'COLLECTOR')), error: () => this.collectorsList.set([]) });
  }

  protected openAdd(): void {
    this.editingLocationId.set(null);
    this.createForm.reset({ name: '', address: '', city: '' });
    this.modalMode.set('add');
  }

  protected openEdit(location: LocationRecord): void {
    this.editingLocationId.set(location.id);
    this.createForm.reset({ name: location.name, address: location.address || '', city: location.city || '' });
    this.modalMode.set('edit');
  }

  protected openAssign(location: LocationRecord): void {
    this.editingLocationId.set(location.id);
    this.assignForm.reset({ collectorId: '' });
    this.modalMode.set('assign');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingLocationId.set(null);
  }

  protected saveCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const v = this.createForm.getRawValue();
    this.locationService.createLocation({ name: v.name, address: v.address || undefined, city: v.city || undefined }).subscribe({
      next: (created) => {
        this.locations.update((list) => [created, ...list]);
        this.closeModal();
      },
    });
  }

  protected saveEdit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const id = this.editingLocationId();
    if (!id) return;

    const v = this.createForm.getRawValue();
    this.locationService.updateLocation(id, { name: v.name, address: v.address || undefined, city: v.city || undefined }).subscribe({
      next: (updated) => {
        this.locations.update((list) => list.map(l => (l.id === updated.id ? updated : l)));
        this.closeModal();
      }
    });
  }

  protected saveAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const collectorId = this.assignForm.getRawValue().collectorId;
    const locId = this.editingLocationId();
    if (!locId) return;

    this.locationService.assignCollector(locId, collectorId).subscribe({ next: () => this.loadLocations() });
    this.closeModal();
  }

  protected deleteLocation(location: LocationRecord): void {
    this.dialogService.create({
      zTitle: 'Delete Location',
      zDescription: `Are you sure you want to delete ${location.name}? This will remove all assignments.`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.locationService.deleteLocation(location.id).subscribe({ next: () => this.loadLocations() });
      },
    });
  }

  protected unassign(location: LocationRecord, assignment: any): void {
    this.dialogService.create({
      zTitle: 'Remove Collector',
      zDescription: `Remove ${assignment.collector.name} from ${location.name}?`,
      zOkText: 'Remove',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.locationService.unassignCollector(location.id, assignment.collector.id).subscribe({ next: () => this.loadLocations() });
      },
    });
  }
}
