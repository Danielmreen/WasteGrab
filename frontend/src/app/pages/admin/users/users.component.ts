import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { AppHeaderComponent } from '@/components/header/header.component';
import { ZardTableImports } from '@/components/table';
import { ZardButtonComponent } from '@/components/button/button.component';
import { ZardBadgeComponent } from '@/components/badge';
import { ZardModalComponent } from '@/components/modal/modal.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/components/form/form.component';
import { ZardInputDirective } from '@/components/input';
import { ZardSelectImports } from '@/components/select/select.imports';
import { ZardDialogService } from '@/components/dialog/dialog.service';
import { UserService } from '@/services/user.service';
import { DisplayRolePipe, RoleBadgeTypePipe } from '@/utils/role.pipe';
import type { User, CreateUserInput } from '@wastegrab/shared';
import { UserRole } from '@wastegrab/shared';

type UserModalMode = 'add' | 'edit' | null;

@Component({
  selector: 'app-admin-users-page',
  templateUrl: './users.html',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AppHeaderComponent,
    ...ZardTableImports,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    ...ZardSelectImports,
    DisplayRolePipe,
    RoleBadgeTypePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage implements OnInit {
  private readonly userService = inject(UserService);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly users = signal<User[]>([]);
  protected readonly userModalMode = signal<UserModalMode>(null);
  protected readonly editingUserId = signal<string | null>(null);

  protected readonly userForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
    }),
    phone: new FormControl('', {
      nonNullable: true,
    }),
    role: new FormControl(UserRole.CUSTOMER, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly userRoles = [UserRole.ADMIN, UserRole.COLLECTOR, UserRole.CUSTOMER];

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.userService.listUsers().subscribe({
      next: (list) => this.users.set(list),
      error: () => this.users.set([]),
    });
  }

  protected openAddUser(): void {
    this.editingUserId.set(null);
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: UserRole.CUSTOMER,
    });
    this.userModalMode.set('add');
  }

  protected openEditUser(user: User): void {
    this.editingUserId.set(user.id);
    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone ?? '',
      role: user.role,
    });
    // Disable email field for editing
    this.userForm.get('email')?.disable();
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userModalMode.set('edit');
  }

  protected closeUserModal(): void {
    this.userModalMode.set(null);
    this.editingUserId.set(null);
    this.userForm.reset({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: UserRole.CUSTOMER,
    });
    // Re-enable email field
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  protected saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const currentId = this.editingUserId();
    const values = this.userForm.getRawValue();

    if (currentId === null) {
      this.userService.createUser({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        role: values.role,
      }).subscribe({
        next: (created) => {
          this.users.update((list) => [created, ...list]);
          this.closeUserModal();
        },
      });
      return;
    }

    this.userService.updateUser(currentId, {
      name: values.name,
      phone: values.phone || undefined,
      role: values.role,
    }).subscribe({
      next: (updated) => {
        this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.closeUserModal();
      },
    });
  }

  protected deleteUser(user: User): void {
    this.dialogService.create({
      zTitle: 'Delete User',
      zDescription: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.users.update((list) => list.filter((u) => u.id !== user.id));
          },
        });
      },
    });
  }
}

