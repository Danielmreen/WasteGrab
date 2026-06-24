
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCoins,
  lucideGift,
  lucideLoaderCircle,
  lucidePencil,
  lucidePlus,
  lucideReceiptText,
  lucideScrollText,
  lucideTrash2,
  lucideWifi,
} from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardDatePickerComponent } from '@/ui/zard/date-picker';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardSelectImports } from '@/ui/zard/select/select.imports';
import { ZardTableImports } from '@/ui/zard/table';
import { AdminVoucherService } from '@/services/admin-voucher.service';
import {
  VoucherStatus,
  type AdminPointLedgerLog,
  type AdminVoucherRedemptionLog,
  type Voucher,
} from '@wastegrab/shared';

type VoucherTab = 'catalog' | 'redemptions' | 'ledger';
type VoucherModalMode = 'add' | 'edit' | null;
type VoucherCatalogFilter = 'all' | VoucherStatus;

@Component({
  selector: 'app-admin-vouchers-page',
  templateUrl: './vouchers.html',
  imports: [

    DatePipe,
    ReactiveFormsModule,
    AppHeaderComponent,
    ZardButtonComponent,
    TableHeaderComponent,
    ZardDatePickerComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    EmptyStateComponent,
    NgIcon,
    ...ZardSelectImports,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideCoins,
      lucideGift,
      lucideLoaderCircle,
      lucidePencil,
      lucidePlus,
      lucideReceiptText,
      lucideScrollText,
      lucideTrash2,
      lucideWifi,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVouchersPage implements OnInit {
  private readonly vouchersService = inject(AdminVoucherService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly VoucherStatus = VoucherStatus;
  protected readonly statusOptions = [
    { value: VoucherStatus.ACTIVE, label: 'Active' },
    { value: VoucherStatus.INACTIVE, label: 'Inactive' },
    { value: VoucherStatus.EXPIRED, label: 'Expired' },
  ];
  protected readonly activeTab = signal<VoucherTab>('catalog');
  protected readonly activeCatalogFilter = signal<VoucherCatalogFilter>('all');
  protected readonly activeRedemptionFilter = signal<string>('all');
  protected readonly activeLedgerFilter = signal<string>('all');
  protected readonly vouchers = signal<Voucher[]>([]);
  protected readonly redemptions = signal<AdminVoucherRedemptionLog[]>([]);
  protected readonly pointLedger = signal<AdminPointLedgerLog[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly modalMode = signal<VoucherModalMode>(null);
  protected readonly editingVoucherId = signal<string | null>(null);
  protected readonly catalogFilters: Array<{ value: VoucherCatalogFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: VoucherStatus.ACTIVE, label: 'Active' },
    { value: VoucherStatus.INACTIVE, label: 'Inactive' },
    { value: VoucherStatus.EXPIRED, label: 'Expired' },
  ];
  protected readonly redemptionFilters = computed<Array<{ value: string; label: string }>>(() => {
    const statuses = [...new Set(this.redemptions().map((entry) => entry.status).filter(Boolean))];
    return [
      { value: 'all', label: 'All' },
      ...statuses.map((status) => ({ value: status, label: status })),
    ];
  });
  protected readonly ledgerFilters = computed<Array<{ value: string; label: string }>>(() => {
    const types = [...new Set(this.pointLedger().map((entry) => entry.type).filter(Boolean))];
    return [
      { value: 'all', label: 'All' },
      ...types.map((type) => ({ value: type, label: type })),
    ];
  });
  protected readonly filteredVouchers = computed(() => {
    const vouchers = this.vouchers();
    const filter = this.activeCatalogFilter();
    if (filter === 'all') return vouchers;
    return vouchers.filter((voucher) => voucher.status === filter);
  });
  protected readonly filteredRedemptions = computed(() => {
    const redemptions = this.redemptions();
    const filter = this.activeRedemptionFilter();
    if (filter === 'all') return redemptions;
    return redemptions.filter((entry) => entry.status === filter);
  });
  protected readonly filteredPointLedger = computed(() => {
    const entries = this.pointLedger();
    const filter = this.activeLedgerFilter();
    if (filter === 'all') return entries;
    return entries.filter((entry) => entry.type === filter);
  });

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    imageUrl: new FormControl('', { nonNullable: true }),
    pointsCost: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    code: new FormControl('', { nonNullable: true }),
    stock: new FormControl<number | null>(null),
    status: new FormControl<VoucherStatus>(VoucherStatus.ACTIVE, { nonNullable: true }),
    startsAt: new FormControl<Date | null>(null),
    expiresAt: new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    void this.loadInitialData();
  }

  protected selectTab(tab: VoucherTab): void {
    this.activeTab.set(tab);
  }

  protected setCatalogFilter(filter: VoucherCatalogFilter): void {
    this.activeCatalogFilter.set(filter);
  }

  protected setRedemptionFilter(filter: string): void {
    this.activeRedemptionFilter.set(filter);
  }

  protected setLedgerFilter(filter: string): void {
    this.activeLedgerFilter.set(filter);
  }

  protected openAdd(): void {
    this.editingVoucherId.set(null);
    this.form.reset({
      title: '',
      description: '',
      imageUrl: '',
      pointsCost: 0,
      code: '',
      stock: null,
      status: VoucherStatus.ACTIVE,
      startsAt: null,
      expiresAt: null,
    });
    this.modalMode.set('add');
  }

  protected openEdit(voucher: Voucher): void {
    this.editingVoucherId.set(voucher.id);
    this.form.reset({
      title: voucher.title,
      description: voucher.description ?? '',
      imageUrl: voucher.imageUrl ?? '',
      pointsCost: voucher.pointsCost,
      code: voucher.code ?? '',
      stock: voucher.stock,
      status: voucher.status,
      startsAt: toDate(voucher.startsAt),
      expiresAt: toDate(voucher.expiresAt),
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingVoucherId.set(null);
  }

  protected saveCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.vouchersService.createVoucher(this.formPayload()).subscribe({
      next: (created) => {
        this.vouchers.update((list) => [created, ...list]);
        this.closeModal();
      },
      error: (err) => this.showError(err, 'Unable to create voucher.'),
    });
  }

  protected saveEdit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingVoucherId();
    if (!id) return;

    this.vouchersService.updateVoucher(id, this.formPayload()).subscribe({
      next: (updated) => {
        this.vouchers.update((list) => list.map((voucher) => (
          voucher.id === updated.id ? updated : voucher
        )));
        this.closeModal();
      },
      error: (err) => this.showError(err, 'Unable to update voucher.'),
    });
  }

  protected deleteVoucher(voucher: Voucher): void {
    this.dialogService.create({
      zTitle: 'Delete Voucher',
      zDescription: `Delete ${voucher.title}? Vouchers with redemption history should be set inactive instead.`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.vouchersService.deleteVoucher(voucher.id).subscribe({
          next: () => this.vouchers.update((list) => list.filter((item) => item.id !== voucher.id)),
          error: (err) => this.showError(err, 'Unable to delete voucher.'),
        });
      },
    });
  }

  protected statusClass(status: VoucherStatus): string {
    if (status === VoucherStatus.ACTIVE) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    if (status === VoucherStatus.EXPIRED) return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    return 'bg-muted text-muted-foreground';
  }

  protected pointsClass(points: number): string {
    return points >= 0 ? 'text-emerald-700' : 'text-rose-700';
  }

  protected shortId(id: string | null): string {
    return id ? id.slice(0, 8).toUpperCase() : '-';
  }

  private async loadInitialData(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const [vouchers, redemptions, pointLedger] = await Promise.all([
        firstValueFrom(this.vouchersService.listVouchers()),
        firstValueFrom(this.vouchersService.listRedemptions()),
        firstValueFrom(this.vouchersService.listPointLedger()),
      ]);
      this.vouchers.set(vouchers);
      this.redemptions.set(redemptions);
      this.pointLedger.set(pointLedger);
    } catch {
      this.vouchers.set([]);
      this.redemptions.set([]);
      this.pointLedger.set([]);
      this.loadError.set('Unable to load vouchers data.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private formPayload() {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      description: value.description || null,
      imageUrl: value.imageUrl || null,
      pointsCost: Number(value.pointsCost),
      code: value.code || null,
      stock: value.stock === null || value.stock === undefined || String(value.stock) === ''
        ? null
        : Number(value.stock),
      status: value.status,
      startsAt: toStartOfDayIso(value.startsAt),
      expiresAt: toEndOfDayIso(value.expiresAt),
    };
  }

  private showError(err: unknown, fallback: string): void {
    const message = getErrorMessage(err) || fallback;
    this.dialogService.create({
      zTitle: 'Action failed',
      zDescription: message,
      zOkText: 'OK',
      zWidth: 'max-w-sm',
    });
  }
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toStartOfDayIso(date: Date | null): string | null {
  if (!date) return null;
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value.toISOString();
}

function toEndOfDayIso(date: Date | null): string | null {
  if (!date) return null;
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value.toISOString();
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
