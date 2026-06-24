import { isPlatformBrowser } from '@angular/common';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, computed, inject, signal, viewChild, TemplateRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@/services/auth.service';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { ZardSheetService } from '@/ui/zard/sheet/sheet.service';
import { ZardAvatarComponent } from '@/ui/zard/avatar/avatar.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardBadgeComponent } from '@/ui/zard/badge';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { ZardTableImports } from '@/ui/zard/table';
import { ProfileModalComponent } from './profile-modal.component';
import { AddressService } from '@/services/address.service';
import { GooglePlaceInputComponent, type GooglePlaceSelection } from '@/ui/google-place-input/google-place-input.component';
import type { Address } from '@wastegrab/shared';

type AddressModalMode = 'add' | 'edit' | null;
type AddressFilter = 'all' | 'default' | 'other';

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
    TableHeaderComponent,
    GooglePlaceInputComponent,
  ],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dialogService = inject(ResponsiveDialogService);
  private readonly sheetService = inject(ZardSheetService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private readonly profileModal = viewChild(ProfileModalComponent);
  private readonly logoutSheetContent = viewChild<TemplateRef<unknown>>('logoutSheetContent');
  private readonly addressService = inject(AddressService);

  protected readonly address = signal<AddressItem[]>([] as AddressItem[]);
  protected readonly isLoadingAddress = signal(true);
  protected readonly loadAddressError = signal('');
  protected readonly isUploadingAvatar = signal(false);
  protected readonly activeAddressFilter = signal<AddressFilter>('all');
  protected readonly addressModalMode = signal<AddressModalMode>(null);
  protected readonly editingAddressId = signal<string | null>(null);
  protected readonly addressFilters: Array<{ value: AddressFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'default', label: 'Default' },
    { value: 'other', label: 'Other' },
  ];
  protected readonly defaultAddress = computed(() =>
    this.address().find((address) => address.isDefault) ?? null,
  );
  protected readonly filteredAddresses = computed(() => {
    const addresses = this.address();
    const filter = this.activeAddressFilter();

    if (filter === 'default') {
      return addresses.filter((address) => address.isDefault);
    }

    if (filter === 'other') {
      return addresses.filter((address) => !address.isDefault);
    }

    return addresses;
  });

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
    formattedAddress: new FormControl('', {
      nonNullable: true,
    }),
    googlePlaceId: new FormControl('', {
      nonNullable: true,
    }),
    latitude: new FormControl<number | null>(null),
    longitude: new FormControl<number | null>(null),
    notes: new FormControl('', {
      nonNullable: true,
    }),
  });

  ngOnInit(): void {
    this.disableGoogleAddressFields();

    if (!this.authService.hasLoadedSession()) {
      void this.authService.loadSession().subscribe();
    }
    this.loadAddresses();
  }

  protected retryLoadAddress(): void {
    this.loadAddresses();
  }

  protected setAddressFilter(filter: AddressFilter): void {
    this.activeAddressFilter.set(filter);
  }

  protected editProfile(): void {
    this.profileModal()?.openEditProfile();
  }

  protected changePassword(): void {
    this.profileModal()?.openChangePassword();
  }

  protected uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      this.dialogService.create({
        zTitle: 'Unsupported Image',
        zDescription: 'Please choose a JPG, PNG, WebP, or HEIC image.',
        zOkText: 'OK',
        zWidth: 'max-w-sm',
      });
      return;
    }

    this.isUploadingAvatar.set(true);
    this.authService.uploadAvatar(file).subscribe({
      next: () => {
        this.dialogService.create({
          zTitle: 'Profile Picture Updated',
          zDescription: 'Your new profile picture is ready.',
          zOkText: 'Done',
          zWidth: 'max-w-sm',
        });
      },
      error: (err) => {
        this.dialogService.create({
          zTitle: 'Upload Failed',
          zDescription: getErrorMessage(err) || 'Unable to upload profile picture.',
          zOkText: 'OK',
          zWidth: 'max-w-sm',
        });
      },
      complete: () => this.isUploadingAvatar.set(false),
    });
  }

  protected openAddAddress(): void {
    this.editingAddressId.set(null);
    this.addressForm.reset({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      formattedAddress: '',
      googlePlaceId: '',
      latitude: null,
      longitude: null,
      notes: '',
    });
    this.addressModalMode.set('add');
    this.disableGoogleAddressFields();
  }

  protected openEditAddress(address: AddressItem): void {
    this.editingAddressId.set(address.id);
    this.addressForm.patchValue({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      formattedAddress: address.formattedAddress ?? '',
      googlePlaceId: address.googlePlaceId ?? '',
      latitude: address.latitude,
      longitude: address.longitude,
      notes: address.notes ?? '',
    });
    this.addressModalMode.set('edit');
    this.disableGoogleAddressFields();
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
      formattedAddress: '',
      googlePlaceId: '',
      latitude: null,
      longitude: null,
      notes: '',
    });
    this.disableGoogleAddressFields();
  }

  private disableGoogleAddressFields(): void {
    this.addressForm.controls.street.disable({ emitEvent: false });
    this.addressForm.controls.city.disable({ emitEvent: false });
    this.addressForm.controls.state.disable({ emitEvent: false });
    this.addressForm.controls.postalCode.disable({ emitEvent: false });
  }

  protected applyAddressPlace(place: GooglePlaceSelection): void {
    this.addressForm.patchValue({
      street: place.addressLine || place.formattedAddress,
      city: place.city,
      state: place.state,
      postalCode: place.postalCode,
      formattedAddress: place.formattedAddress,
      googlePlaceId: place.placeId,
      latitude: place.latitude,
      longitude: place.longitude,
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

  protected deleteAddress(address: AddressItem): void {
    this.dialogService.create({
      zTitle: 'Delete Address',
      zDescription: `Are you sure you want to delete ${address.label}?`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.addressService.deleteAddress(address.id).subscribe({
          next: () => {
            this.address.update((list) => list.filter((item) => item.id !== address.id));
          },
        });
      },
    });
  }

  protected logout(): void {
    const onOk = () => {
      this.authService.logout().subscribe({
        next: () => (window.location.href = '/auth'),
        error: () => (window.location.href = '/auth'),
      });
    };

    const isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 768;
    const content = this.logoutSheetContent();

    if (isMobile && content) {
      this.sheetService.create({
        zContent: content,
        zSide: 'bottom',
        zTitle: 'Confirm Logout',
        zOkText: 'Logout',
        zOkDestructive: true,
        zCancelText: 'Cancel',
        zCustomClasses: 'rounded-t-2xl',
        zOnOk: onOk,
      });
    } else {
      this.dialogService.create({
        zTitle: 'Confirm Logout',
        zDescription: 'Are you sure you want to logout?',
        zOkText: 'Logout',
        zOkDestructive: true,
        zCancelText: 'Cancel',
        zWidth: 'max-w-sm',
        zOnOk: onOk,
      });
    }
  }

  private loadAddresses(): void {
    this.isLoadingAddress.set(true);
    this.loadAddressError.set('');
    this.addressService.listAddress().subscribe({
      next: (list) => this.address.set(list as AddressItem[]),
      error: () => {
        this.address.set([] as AddressItem[]);
        this.loadAddressError.set('Unable to load saved addresses.');
      },
      complete: () => this.isLoadingAddress.set(false),
    });
  }
}

function getErrorMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) {
    return null;
  }

  const response = (err as { error?: unknown }).error;
  if (typeof response === 'object' && response !== null && 'error' in response) {
    const message = (response as { error?: unknown }).error;
    return typeof message === 'string' ? message : null;
  }

  return null;
}
