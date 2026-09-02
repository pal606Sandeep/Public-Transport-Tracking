import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
  secondary: "bg-muted text-foreground hover:bg-border disabled:opacity-50",
  ghost: "bg-transparent text-foreground hover:bg-muted disabled:opacity-50",
  outline:
    "border border-border bg-surface text-foreground hover:bg-muted disabled:opacity-50",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-app)] font-medium",
        "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
);

Button.displayName = "Button";
