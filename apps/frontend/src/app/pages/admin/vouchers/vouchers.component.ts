import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCoins,
  lucideGift,
  lucidePencil,
  lucidePlus,
  lucideReceiptText,
  lucideScrollText,
  lucideTrash2,
} from '@ng-icons/lucide';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
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

@Component({
  selector: 'app-admin-vouchers-page',
  templateUrl: './vouchers.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppHeaderComponent,
    ZardButtonComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    NgIcon,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideCoins,
      lucideGift,
      lucidePencil,
      lucidePlus,
      lucideReceiptText,
      lucideScrollText,
      lucideTrash2,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminVouchersPage implements OnInit {
  private readonly vouchersService = inject(AdminVoucherService);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly VoucherStatus = VoucherStatus;
  protected readonly activeTab = signal<VoucherTab>('catalog');
  protected readonly vouchers = signal<Voucher[]>([]);
  protected readonly redemptions = signal<AdminVoucherRedemptionLog[]>([]);
  protected readonly pointLedger = signal<AdminPointLedgerLog[]>([]);
  protected readonly modalMode = signal<VoucherModalMode>(null);
  protected readonly editingVoucherId = signal<string | null>(null);

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    pointsCost: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    code: new FormControl('', { nonNullable: true }),
    stock: new FormControl<number | null>(null),
    status: new FormControl<VoucherStatus>(VoucherStatus.ACTIVE, { nonNullable: true }),
    startsAt: new FormControl('', { nonNullable: true }),
    expiresAt: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadVouchers();
    this.loadRedemptions();
    this.loadPointLedger();
  }

  protected selectTab(tab: VoucherTab): void {
    this.activeTab.set(tab);
  }

  protected openAdd(): void {
    this.editingVoucherId.set(null);
    this.form.reset({
      title: '',
      description: '',
      pointsCost: 0,
      code: '',
      stock: null,
      status: VoucherStatus.ACTIVE,
      startsAt: '',
      expiresAt: '',
    });
    this.modalMode.set('add');
  }

  protected openEdit(voucher: Voucher): void {
    this.editingVoucherId.set(voucher.id);
    this.form.reset({
      title: voucher.title,
      description: voucher.description ?? '',
      pointsCost: voucher.pointsCost,
      code: voucher.code ?? '',
      stock: voucher.stock,
      status: voucher.status,
      startsAt: toDatetimeLocal(voucher.startsAt),
      expiresAt: toDatetimeLocal(voucher.expiresAt),
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
    if (status === VoucherStatus.ACTIVE) return 'bg-emerald-100 text-emerald-700';
    if (status === VoucherStatus.EXPIRED) return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }

  protected pointsClass(points: number): string {
    return points >= 0 ? 'text-emerald-700' : 'text-rose-700';
  }

  protected shortId(id: string | null): string {
    return id ? id.slice(0, 8).toUpperCase() : '-';
  }

  private loadVouchers(): void {
    this.vouchersService.listVouchers().subscribe({
      next: (vouchers) => this.vouchers.set(vouchers),
      error: () => this.vouchers.set([]),
    });
  }

  private loadRedemptions(): void {
    this.vouchersService.listRedemptions().subscribe({
      next: (redemptions) => this.redemptions.set(redemptions),
      error: () => this.redemptions.set([]),
    });
  }

  private loadPointLedger(): void {
    this.vouchersService.listPointLedger().subscribe({
      next: (ledger) => this.pointLedger.set(ledger),
      error: () => this.pointLedger.set([]),
    });
  }

  private formPayload() {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      description: value.description || null,
      pointsCost: Number(value.pointsCost),
      code: value.code || null,
      stock: value.stock === null || value.stock === undefined || String(value.stock) === ''
        ? null
        : Number(value.stock),
      status: value.status,
      startsAt: value.startsAt ? new Date(value.startsAt).toISOString() : null,
      expiresAt: value.expiresAt ? new Date(value.expiresAt).toISOString() : null,
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

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
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
