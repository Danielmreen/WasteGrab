import { AppHeaderComponent } from '@/components/header/header.component';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type NewPickupForm = FormGroup<{
  wasteCategory: FormControl<string>;
  description: FormControl<string>;
  estimatedQuantity: FormControl<number | null>;
  location: FormControl<string>;
}>;

@Component({
  selector: 'app-customer-new-pickup-page',
  templateUrl: './new-pickup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, AppHeaderComponent],
})
export class CustomerNewPickupPage {

  constructor(private http:HttpClient){}

  protected readonly images = signal<File[]>([]);
  protected readonly previews = signal<string[]>([]);
  protected readonly isAnalyzing = signal(false);
  protected readonly aiSuggestions = signal<Array<{category: string; estimatedQuantity: number;}>>([]);

  protected readonly addresses = [
    { id: 'home', label: 'Home — 123 Main St' },
    { id: 'work', label: 'Work — 456 Office Rd' },
  ];

  protected readonly form: NewPickupForm = new FormGroup({
    wasteCategory: new FormControl('', { nonNullable: true, validators: [Validators.required]}),
    description: new FormControl('', { nonNullable: true }),
    estimatedQuantity: new FormControl<number | null>(null),
    location: new FormControl(this.addresses[0].id, { nonNullable: true }),
  });

  protected onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    this.images.set(files);

    const urls = files.map(f => URL.createObjectURL(f));
    this.previews.set(urls);
  }

  protected clearImages(): void {
    this.images().forEach(() => {});
    this.images.set([]);
    this.previews().forEach(url => URL.revokeObjectURL(url));
    this.previews.set([]);
    this.aiSuggestions.set([]);
  }

  // protected analyzeImagesMock(): void {
  //   const imgs = this.images();
  //   if (!imgs.length) return;
  //   this.isAnalyzing.set(true);
  //   this.aiSuggestions.set([]);

  //   // Mock AI analysis — produce simple heuristic suggestions
  //   setTimeout(() => {
  //     const suggestions: Array<{category: string; estimatedQuantity: number}> = [];
  //     // simple heuristic: count images and randomize categories
  //     const cats = ['Plastic Bottles', 'Mixed Recyclables', 'Organic Waste', 'Paper/Cardboard', 'Metal Cans'];
  //     const main = cats[Math.floor(Math.random() * cats.length)];
  //     const qty = Math.max(1, Math.round(imgs.length * (1 + Math.random())));
  //     suggestions.push({ category: main, estimatedQuantity: qty });
  //     this.aiSuggestions.set(suggestions);
  //     this.isAnalyzing.set(false);
  //   }, 900);
  // }
  
      protected async analyzeImagesMock(): Promise<void> {

      const imgs = this.images();
      if (!imgs.length) return;

      this.isAnalyzing.set(true);
      this.aiSuggestions.set([]);

      try {

        // For now: analyze only first image
        const formData = new FormData();
        formData.append('image', imgs[0]);

        const response: any = await firstValueFrom(
          this.http.post(
            'http://localhost:3000/api/roboflow-ai/analyze-image',
            formData
          )
        );

        const result = response.result;

        if (!result) {
          console.error('No AI result returned');
          return;
        }

        // Convert backend result → suggestion format
        const suggestions = [
          {
            category: result.detectedWaste.join(', ') || 'Mixed Recyclables',
            estimatedQuantity: Math.ceil(result.estimatedWeight) || 1
          }
        ];

        this.aiSuggestions.set(suggestions);

      } catch (err) {

        console.error('AI analysis failed:', err);

      } finally {

        this.isAnalyzing.set(false);

      }
    }

  protected applySuggestion(s: {category: string; estimatedQuantity: number}): void {
    this.form.get('wasteCategory')?.setValue(s.category);
    this.form.get('estimatedQuantity')?.setValue(s.estimatedQuantity);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.form.getRawValue(),
      images: this.images().map(f => f.name),
    };

    // For now: mock submit — in future hook to backend service
    // eslint-disable-next-line no-console
    console.log('Submitting pickup request', payload);
    alert('Pickup request submitted (mock).');
    this.form.reset({ location: this.addresses[0].id });
    this.clearImages();
  }
}
