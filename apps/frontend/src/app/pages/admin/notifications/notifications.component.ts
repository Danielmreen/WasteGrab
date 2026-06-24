import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBell,
  lucideBold,
  lucideEye,
  lucideHeading1,
  lucideHeading2,
  lucideItalic,
  lucideList,
  lucidePencil,
  lucidePin,
  lucidePlus,
  lucideRadio,
  lucideSend,
  lucideTrash2,
  lucideLoaderCircle,
  lucideWifi,
} from '@ng-icons/lucide';
import { NotificationTargetRole, type AdminNotificationLog } from '@wastegrab/shared';

import { ROUTE_PATHS, routePath } from '@/app.routes';
import { AdminNotificationService } from '@/services/admin-notification.service';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { ZardBadgeComponent } from '@/ui/zard/badge';
import { ZardCheckboxComponent } from '@/ui/zard/checkbox';
import { ZardDatePickerComponent } from '@/ui/zard/date-picker';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardSelectImports } from '@/ui/zard/select/select.imports';
import { ZardTableImports } from '@/ui/zard/table';
import { NotificationMarkdownPipe } from '@/utils/notification-markdown.pipe';

type NotificationTab = 'announcements' | 'deliveries' | 'policy';
type NotificationModalMode = 'add' | 'edit' | null;
type NotificationFilter = 'all' | 'clearable' | 'pinned' | 'expiring';
type MarkdownFormat = 'h1' | 'h2' | 'bold' | 'italic' | 'list';

@Component({
  selector: 'app-admin-notifications-page',
  templateUrl: './notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AppHeaderComponent,
    TableHeaderComponent,
    ZardBadgeComponent,
    ZardCheckboxComponent,
    ZardDatePickerComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    NotificationMarkdownPipe,
    EmptyStateComponent,
    NgIcon,
    ...ZardSelectImports,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideBell,
      lucideBold,
      lucideEye,
      lucideHeading1,
      lucideHeading2,
      lucideItalic,
      lucideList,
      lucidePencil,
      lucidePin,
      lucidePlus,
      lucideRadio,
      lucideSend,
      lucideTrash2,
      lucideLoaderCircle,
      lucideWifi,
    }),
  ],
})
export class AdminNotificationsPage implements OnInit {
  private readonly notificationService = inject(AdminNotificationService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly NotificationTargetRole = NotificationTargetRole;
  protected readonly audienceOptions = [
    { value: NotificationTargetRole.ALL, label: 'Everyone' },
    { value: NotificationTargetRole.CUSTOMER, label: 'Customers' },
    { value: NotificationTargetRole.COLLECTOR, label: 'Collectors' },
    { value: NotificationTargetRole.ADMIN, label: 'Admins' },
  ];
  protected readonly dashboardRoute = routePath(ROUTE_PATHS.admin.base);
  protected readonly logs = signal<AdminNotificationLog[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly isSending = signal(false);
  protected readonly activeTab = signal<NotificationTab>('announcements');
  protected readonly activeFilter = signal<NotificationFilter>('all');
  protected readonly modalMode = signal<NotificationModalMode>(null);
  protected readonly editingLog = signal<AdminNotificationLog | null>(null);
  protected readonly filters: Array<{ value: NotificationFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'clearable', label: 'Clearable' },
    { value: 'pinned', label: 'Pinned' },
    { value: 'expiring', label: 'Expiring' },
  ];
  protected readonly editorActions: Array<{ format: MarkdownFormat; label: string; icon: string }> = [
    { format: 'h1', label: 'Heading 1', icon: 'lucideHeading1' },
    { format: 'h2', label: 'Heading 2', icon: 'lucideHeading2' },
    { format: 'bold', label: 'Bold', icon: 'lucideBold' },
    { format: 'italic', label: 'Italic', icon: 'lucideItalic' },
    { format: 'list', label: 'Bullet list', icon: 'lucideList' },
  ];
  protected readonly totalSent = computed(() => this.logs().reduce((sum, log) => sum + log.sentCount, 0));
  protected readonly pinnedCount = computed(() => this.logs().filter((log) => !log.isClearable).length);
  protected readonly expiringCount = computed(() => this.logs().filter((log) => Boolean(log.expiresAt)).length);
  protected readonly clearableCount = computed(() => this.logs().filter((log) => log.isClearable).length);
  protected readonly filteredLogs = computed(() => {
    const logs = this.logs();
    const filter = this.activeFilter();

    if (filter === 'clearable') return logs.filter((log) => log.isClearable);
    if (filter === 'pinned') return logs.filter((log) => !log.isClearable);
    if (filter === 'expiring') return logs.filter((log) => Boolean(log.expiresAt));
    return logs;
  });

  protected readonly announcementForm = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    targetRole: new FormControl<NotificationTargetRole>(NotificationTargetRole.ALL, { nonNullable: true }),
    actionUrl: new FormControl('', { nonNullable: true }),
    isClearable: new FormControl(true, { nonNullable: true }),
    expiresAt: new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    this.loadLogs();
  }

  protected selectTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
  }

  protected setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  protected openAdd(): void {
    this.editingLog.set(null);
    this.announcementForm.reset({
      title: '',
      message: '',
      targetRole: NotificationTargetRole.ALL,
      actionUrl: '',
      isClearable: true,
      expiresAt: null,
    });
    this.modalMode.set('add');
  }

  protected openEdit(log: AdminNotificationLog): void {
    this.editingLog.set(log);
    this.announcementForm.reset({
      title: log.title,
      message: log.message,
      targetRole: NotificationTargetRole.ALL,
      actionUrl: log.actionUrl ?? '',
      isClearable: log.isClearable,
      expiresAt: toDate(log.expiresAt),
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingLog.set(null);
  }

  protected applyMessageFormat(format: MarkdownFormat, textarea: HTMLTextAreaElement): void {
    const control = this.announcementForm.controls.message;
    const value = control.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const replacement = formatMarkdownSelection(format, selected);
    const nextValue = `${value.slice(0, start)}${replacement}${value.slice(end)}`;

    control.setValue(nextValue);
    control.markAsDirty();

    window.setTimeout(() => {
      textarea.focus();
      const cursorStart = start + replacement.length;
      textarea.setSelectionRange(cursorStart, cursorStart);
    });
  }

  protected sendAnnouncement(): void {
    if (this.announcementForm.invalid || this.isSending()) {
      this.announcementForm.markAllAsTouched();
      return;
    }

    const value = this.announcementForm.getRawValue();
    this.isSending.set(true);

    if (this.modalMode() === 'edit') {
      const log = this.editingLog();
      if (!log) {
        this.isSending.set(false);
        return;
      }

      this.notificationService.updateNotification(log.id, {
        title: value.title,
        message: value.message,
        actionUrl: value.actionUrl || null,
        isClearable: value.isClearable,
        expiresAt: toEndOfDayIso(value.expiresAt),
      }).subscribe({
        next: (updated) => {
          this.logs.update((logs) => logs.map((item) => item.id === log.id ? updated : item));
          this.closeModal();
        },
        error: (err) => {
          this.isSending.set(false);
          this.dialogService.create({
            zTitle: 'Update failed',
            zDescription: getErrorMessage(err) || 'Unable to update announcement.',
            zOkText: 'OK',
            zWidth: 'max-w-sm',
          });
        },
        complete: () => this.isSending.set(false),
      });
      return;
    }

    this.notificationService.sendNotification({
      title: value.title,
      message: value.message,
      targetRole: value.targetRole,
      actionUrl: value.actionUrl || null,
      isClearable: value.isClearable,
      expiresAt: toEndOfDayIso(value.expiresAt),
    }).subscribe({
      next: (response) => {
        this.dialogService.create({
          zTitle: 'Announcement sent',
          zDescription: `Sent to ${response.sentCount} user${response.sentCount === 1 ? '' : 's'}.`,
          zOkText: 'Done',
          zWidth: 'max-w-sm',
        });
        this.announcementForm.reset({
          title: '',
          message: '',
          targetRole: NotificationTargetRole.ALL,
          actionUrl: '',
          isClearable: true,
          expiresAt: null,
        });
        this.closeModal();
        this.loadLogs();
      },
      error: (err) => {
        this.isSending.set(false);
        this.dialogService.create({
          zTitle: 'Send failed',
          zDescription: getErrorMessage(err) || 'Unable to send announcement.',
          zOkText: 'OK',
          zWidth: 'max-w-sm',
        });
      },
      complete: () => this.isSending.set(false),
    });
  }

  protected deleteAnnouncement(log: AdminNotificationLog): void {
    this.dialogService.create({
      zTitle: 'Delete Announcement',
      zDescription: `Delete "${log.title}" for all ${log.sentCount} recipient${log.sentCount === 1 ? '' : 's'}?`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.notificationService.deleteNotification(log.id).subscribe({
          next: () => this.logs.update((logs) => logs.filter((item) => item.id !== log.id)),
          error: (err) => {
            this.dialogService.create({
              zTitle: 'Delete failed',
              zDescription: getErrorMessage(err) || 'Unable to delete announcement.',
              zOkText: 'OK',
              zWidth: 'max-w-sm',
            });
          },
        });
      },
    });
  }

  private loadLogs(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.notificationService.listLogs().subscribe({
      next: (response) => this.logs.set(response.logs),
      error: () => {
        this.logs.set([]);
        this.loadError.set('Unable to load notifications.');
      },
      complete: () => this.isLoading.set(false),
    });
  }
}

function toEndOfDayIso(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const expiry = new Date(date);
  expiry.setHours(23, 59, 59, 999);

  return expiry.toISOString();
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
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

function formatMarkdownSelection(format: MarkdownFormat, selected: string): string {
  const text = selected.trim();

  switch (format) {
    case 'h1':
      return prefixMarkdownLines(text || 'Heading', '# ');
    case 'h2':
      return prefixMarkdownLines(text || 'Section heading', '## ');
    case 'bold':
      return `**${text || 'bold text'}**`;
    case 'italic':
      return `*${text || 'italic text'}*`;
    case 'list':
      return prefixMarkdownLines(text || 'List item', '- ');
  }
}

function prefixMarkdownLines(value: string, prefix: string): string {
  return value
    .split('\n')
    .map((line) => `${prefix}${line.replace(/^#{1,3}\s+|^[-*]\s+/, '')}`)
    .join('\n');
}
