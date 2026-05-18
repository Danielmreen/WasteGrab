import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { ZardDialogService } from '@/components/dialog/dialog.service';
import { ZardAvatarComponent } from '@/components/avatar/avatar.component';
import { ZardButtonComponent } from '@/components/button/button.component';
import { ZardBadgeComponent } from '@/components/badge';
import { AppHeaderComponent } from '@/components/header/header.component';
import { ZardModalComponent } from '@/components/modal/modal.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/components/form/form.component';
import { ZardInputDirective } from '@/components/input';
import { ZardTableImports } from '@/components/table';
import { ProfileModalComponent } from './profile-modal.component';
import { AddressService } from '@/services/address.service';
import type { Address } from '@wastegrab/shared';

type AddressModalMode = 'add' | 'edit' | null;

type AddressItem = Address;

@Component({
  selector: 'app-profile-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ...ZardTableImports,
    ZardAvatarComponent,
    ZardBadgeComponent,
    ZardButtonComponent,
    AppHeaderComponent,
    ProfileModalComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
  ],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly router = inject(Router);

  private readonly profileModal = viewChild(ProfileModalComponent);
  private readonly addressService = inject(AddressService);

  protected readonly address = signal<AddressItem[]>([] as AddressItem[]);
  protected readonly addressModalMode = signal<AddressModalMode>(null);
  protected readonly editingAddressId = signal<string | null>(null);
  protected readonly defaultAddress = computed(() =>
    this.address().find((address) => address.isDefault) ?? null,
  );

  protected readonly addressForm = new FormGroup({
    label: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    street: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    city: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    state: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    postalCode: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4)],
    }),
    notes: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    if (!this.authService.hasLoadedSession()) {
      void this.authService.loadSession().subscribe();
    }
    this.addressService.listAddress().subscribe({
      next: (list) => this.address.set(list as AddressItem[]),
      error: () => this.address.set([] as AddressItem[]),
    });
  }

  protected editProfile(): void {
    this.profileModal()?.openEditProfile();
  }

  protected changePassword(): void {
    this.profileModal()?.openChangePassword();
  }

  protected openAddAddress(): void {
    this.editingAddressId.set(null);
    this.addressForm.reset({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      notes: '',
    });
    this.addressModalMode.set('add');
  }

  protected openEditAddress(address: AddressItem): void {
    this.editingAddressId.set(address.id);
    this.addressForm.patchValue({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      notes: address.notes ?? '',
    });
    this.addressModalMode.set('edit');
  }

  protected closeAddressModal(): void {
    this.addressModalMode.set(null);
    this.editingAddressId.set(null);
    this.addressForm.reset({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      notes: '',
    });
  }

  protected saveAddress(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    const currentId = this.editingAddressId();
    const values = this.addressForm.getRawValue();

    if (currentId === null) {
      this.addressService.createAddress(values).subscribe({
        next: (created) => {
          this.address.update((list) => [created, ...list]);
          this.closeAddressModal();
        },
      });
      return;
    }

    this.addressService.updateAddress(currentId.toString(), values).subscribe({
      next: (updated) => {
        this.address.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.closeAddressModal();
      },
    });
  }

  protected setDefaultAddress(addressId: string): void {
    this.addressService.setDefaultAddress(addressId).subscribe({
      next: (updated) => {
        this.address.update((list) => list.map((a) => ({ ...a, isDefault: a.id === updated.id })));
      },
    });
  }

  protected logout(): void {
    this.dialogService.create({
      zTitle: 'Confirm Logout',
      zDescription: 'Are you sure you want to logout?',
      zOkText: 'Logout',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.authService.logout().subscribe({
          next: () => (window.location.href = '/auth'),
          error: () => (window.location.href = '/auth'),
        });
      },
    });
  }
}
