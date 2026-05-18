import { ChangeDetectionStrategy, Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormControl, FormGroup } from '@angular/forms';
import { ZardButtonComponent } from '@/components/button/button.component';
import { ZardInputDirective } from '@/components/input';
import { ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent } from '@/components/form/form.component';
import { ZardModalComponent } from '@/components/modal/modal.component';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@/services/auth.service';

type ModalMode = 'edit-profile' | 'change-password' | null;

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardInputDirective,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardModalComponent,
  ],
  template: `
    <!-- Edit Profile Modal -->
    <z-modal
      [isOpen]="modalMode() === 'edit-profile'"
      title="Edit Profile"
      description="Update your profile information"
      okText="Save Changes"
      [okDestructive]="false"
      cancelText="Cancel"
      [isSubmitting]="isSubmitting()"
      [error]="error()"
      size="md"
      (ok)="submitEditProfile()"
      (cancel)="close()"
    >
      <form [formGroup]="editProfileForm" class="space-y-4">
        <z-form-field>
          <z-form-label [zRequired]="true">Full Name</z-form-label>
          <z-form-control>
            <input
              z-input
              type="text"
              formControlName="name"
              placeholder="John Doe"
              class="w-full"
            />
          </z-form-control>
        </z-form-field>

        <z-form-field>
          <z-form-label>Phone (optional)</z-form-label>
          <z-form-control>
            <input
              z-input
              type="tel"
              formControlName="phone"
              placeholder="+1 (555) 000-0000"
              class="w-full"
              autocomplete="tel"
            />
          </z-form-control>
        </z-form-field>
      </form>
    </z-modal>

    <!-- Change Password Modal -->
    <z-modal
      [isOpen]="modalMode() === 'change-password'"
      title="Change Password"
      description="Enter your current and new password"
      okText="Change Password"
      [okDestructive]="false"
      cancelText="Cancel"
      [isSubmitting]="isSubmitting()"
      [error]="error()"
      size="md"
      (ok)="submitChangePassword()"
      (cancel)="close()"
    >
      <form [formGroup]="changePasswordForm" class="space-y-4">
        <z-form-field>
          <z-form-label [zRequired]="true">Current Password</z-form-label>
          <z-form-control>
            <input
              z-input
              type="password"
              formControlName="currentPassword"
              placeholder="Enter your current password"
              class="w-full"
              autocomplete="current-password"
            />
          </z-form-control>
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true">New Password</z-form-label>
          <z-form-control>
            <input
              z-input
              type="password"
              formControlName="newPassword"
              placeholder="At least 8 characters"
              class="w-full"
              autocomplete="new-password"
            />
          </z-form-control>
        </z-form-field>

        <z-form-field>
          <z-form-label [zRequired]="true">Confirm Password</z-form-label>
          <z-form-control>
            <input
              z-input
              type="password"
              formControlName="confirmPassword"
              placeholder="Repeat your password"
              class="w-full"
              autocomplete="new-password"
            />
          </z-form-control>
        </z-form-field>
      </form>
    </z-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileModalComponent {
  private readonly http = inject(HttpClient);
  protected readonly authService = inject(AuthService);

  protected readonly modalMode = signal<ModalMode>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal('');

  readonly closeModal = output<void>();
  readonly successUpdate = output<void>();

  protected readonly editProfileForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
    }),
  });

  protected readonly changePasswordForm = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  openEditProfile(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    
    this.editProfileForm.patchValue({
      name: user.name,
      phone: user.phone || '',
    });
    this.error.set('');
    this.modalMode.set('edit-profile');
  }

  openChangePassword(): void {
    this.changePasswordForm.reset();
    this.error.set('');
    this.modalMode.set('change-password');
  }

  close(): void {
    this.modalMode.set(null);
    this.error.set('');
    this.editProfileForm.reset();
    this.changePasswordForm.reset();
    this.closeModal.emit();
  }

  submitEditProfile(): void {
    if (this.editProfileForm.invalid) {
      this.editProfileForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const { name, phone } = this.editProfileForm.getRawValue();
    this.http.patch('/api/auth/profile', { name, phone }).subscribe({
      next: (response: any) => {
        this.isSubmitting.set(false);
        this.authService.currentUser.set(response.user);
        this.successUpdate.emit();
        this.close();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.error.set(err.error?.error || 'Failed to update profile');
      },
    });
  }

  submitChangePassword(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const newPassword = this.changePasswordForm.get('newPassword')?.value;
    const confirmPassword = this.changePasswordForm.get('confirmPassword')?.value;

    if (newPassword !== confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    const { currentPassword } = this.changePasswordForm.getRawValue();
    this.http.post('/api/auth/change-password', { 
      currentPassword, 
      newPassword 
    }).subscribe({
      next: (response: any) => {
        this.isSubmitting.set(false);
        this.authService.currentUser.set(response.user);
        this.successUpdate.emit();
        this.close();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.error.set(err.error?.error || 'Failed to change password');
      },
    });
  }
}

