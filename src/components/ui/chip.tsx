import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        success: "bg-green-100 text-green-800 hover:bg-green-200",
        warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
        danger: "bg-red-100 text-red-800 hover:bg-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(chipVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };