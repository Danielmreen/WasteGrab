import { cva, type VariantProps } from 'class-variance-authority';

export const dialogVariants = cva(
  'fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg rounded-lg max-w-[calc(100%-2rem)]',
  {
    variants: {
      width: {
        'max-w-sm': 'max-w-sm',
        'max-w-md': 'max-w-md',
        'max-w-lg': 'max-w-lg',
      },
    },
    defaultVariants: {
      width: 'max-w-md',
    },
  },
);
export type ZardDialogVariants = VariantProps<typeof dialogVariants>;
