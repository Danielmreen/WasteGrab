import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardCardComponent } from '@/ui/zard/card/card.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent } from '@/ui/zard/form/form.component';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import { AuthService } from '@/services/auth.service';
import { BrandLogoComponent } from '@/ui/brand/brand-logo.component';
import { AuthSlideService } from '@/services/auth-slide.service';
import type { AuthSlide } from '@wastegrab/shared';

type AuthMode = 'login' | 'register';

type LoginFormGroup = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

type RegisterFormGroup = FormGroup<{
  name: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  phone: FormControl<string>;
}>;

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, ReactiveFormsModule, ZardButtonComponent, ZardCardComponent, ZardInputDirective, ZardFormFieldComponent, ZardFormLabelComponent, ZardFormControlComponent, ZardModalComponent, BrandLogoComponent],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly authSlideService = inject(AuthSlideService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly mode = signal<AuthMode>('login');
  protected readonly isSubmitting = signal(false);
  protected readonly error = signal('');
  protected readonly currentSlide = signal(0);
  protected readonly slides = signal<AuthSlide[]>([]);
  protected autoplayInterval: ReturnType<typeof setInterval> | null = null;
  
  // Forgot password state
  protected readonly showForgotPasswordStep = signal<'email' | 'password' | null>(null);
  protected readonly forgotPasswordEmail = signal('');
  protected readonly forgotPasswordError = signal('');
  protected readonly forgotPasswordSubmitting = signal(false);

  protected readonly loginForm: LoginFormGroup = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly registerForm: RegisterFormGroup = new FormGroup({
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
      validators: [Validators.required, Validators.minLength(8)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
    }),
  });

  protected readonly forgotPasswordForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly resetPasswordForm = new FormGroup({
    token: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  ngOnInit(): void {
    this.loadSlides();
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  protected startAutoplay(): void {
    this.stopAutoplay();
    if (this.slides().length <= 1) return;

    this.autoplayInterval = setInterval(() => {
      const slideCount = this.slides().length;
      if (slideCount <= 1) return;
      this.currentSlide.set((this.currentSlide() + 1) % slideCount);
    }, 5000);
  }

  protected stopAutoplay(): void {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  protected goToSlide(index: number): void {
    if (index < 0 || index >= this.slides().length) return;
    this.currentSlide.set(index);
  }

  protected nextSlide(): void {
    const slideCount = this.slides().length;
    if (slideCount === 0) return;
    this.currentSlide.set((this.currentSlide() + 1) % slideCount);
  }

  protected prevSlide(): void {
    const slideCount = this.slides().length;
    if (slideCount === 0) return;
    this.currentSlide.set((this.currentSlide() - 1 + slideCount) % slideCount);
  }

  private loadSlides(): void {
    this.authSlideService.listSlides().subscribe({
      next: ({ slides }) => {
        this.slides.set(slides);
        this.currentSlide.set(slides.length === 0 ? 0 : Math.min(this.currentSlide(), slides.length - 1));
        this.startAutoplay();
      },
      error: () => {
        this.slides.set([]);
        this.currentSlide.set(0);
      },
    });
  }

  protected openForgotPassword(): void {
    this.showForgotPasswordStep.set('email');
    this.forgotPasswordError.set('');
    this.forgotPasswordForm.reset();
    this.resetPasswordForm.reset();
  }

  protected closeForgotPassword(): void {
    this.showForgotPasswordStep.set(null);
    this.forgotPasswordError.set('');
    this.forgotPasswordForm.reset();
    this.resetPasswordForm.reset();
  }

  protected submitForgotPasswordEmail(): void {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotPasswordSubmitting.set(true);
    this.forgotPasswordError.set('');
    
    const emailValue = this.forgotPasswordForm.get('email')?.value;
    if (emailValue) {
      this.authService.forgotPassword(emailValue).subscribe({
        next: (response) => {
          this.forgotPasswordEmail.set(emailValue);
          this.showForgotPasswordStep.set('password');
          this.forgotPasswordSubmitting.set(false);
          this.resetPasswordForm.reset({
            token: response.resetToken ?? '',
            password: '',
            confirmPassword: '',
          });
        },
        error: (err) => {
          this.forgotPasswordError.set(err.error?.error || 'An error occurred while requesting password reset.');
          this.forgotPasswordSubmitting.set(false);
        }
      });
    }
  }

  protected submitResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const token = this.resetPasswordForm.get('token')?.value;
    const password = this.resetPasswordForm.get('password')?.value;
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value;

    if (!token) {
      this.forgotPasswordError.set('Password reset token is required.');
      return;
    }

    if (password !== confirmPassword) {
      this.forgotPasswordError.set('Passwords do not match.');
      return;
    }

    this.forgotPasswordSubmitting.set(true);
    this.forgotPasswordError.set('');
    
      if (!password) {
        this.forgotPasswordSubmitting.set(false);
        return;
      }
      this.authService.resetPassword(token, password).subscribe({
      next: () => {
        this.dialogService.create({
          zTitle: 'Success',
          zContent: 'Password reset successfully.',
          zOkText: 'Sign In',
          zCancelText: null,
          zWidth: 'max-w-sm',
          zOnOk: () => {
            this.closeForgotPassword();
            this.forgotPasswordSubmitting.set(false);
            this.mode.set('login');
          },
        });
      },
      error: (err) => {
        this.forgotPasswordError.set(err.error?.error || 'Unable to reset password.');
        this.forgotPasswordSubmitting.set(false);
      },
    });
  }

  protected switchMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.error.set('');
  }

  protected submitLogin(): void {
    if (this.loginForm.invalid || this.isSubmitting()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: async (user) => {
        this.isSubmitting.set(false);
        await this.router.navigateByUrl(this.authService.getDefaultRouteForRole(user.role));
      },
      error: (err: unknown) => {
        const message = this.getAuthErrorMessage(err);
        this.error.set(message ?? 'Could not sign in. Check your email and password.');
        this.isSubmitting.set(false);
      },
    });
  }

  protected submitRegister(): void {
    if (this.registerForm.invalid || this.isSubmitting()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set('');

    this.authService.register(this.registerForm.getRawValue()).subscribe({
      next: async (user) => {
        this.isSubmitting.set(false);
        await this.router.navigateByUrl(this.authService.getDefaultRouteForRole(user.role));
      },
      error: (err: unknown) => {
        const message = this.getAuthErrorMessage(err);
        this.error.set(message ?? 'Could not create your account.');
        this.isSubmitting.set(false);
      },
    });
  }

  private getAuthErrorMessage(err: unknown): string | null {
    const invalidMessages = new Set(['Invalid user role.', 'Invalid user data.']);

    if (typeof err === 'object' && err !== null) {
      const errorObj = err as { message?: string; error?: { error?: string } };

      if (errorObj.error?.error && invalidMessages.has(errorObj.error.error)) {
        return errorObj.error.error;
      }

      if (errorObj.message && invalidMessages.has(errorObj.message)) {
        return errorObj.message;
      }
    }

    return null;
  }
}
