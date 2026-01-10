import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          {
            // Variants
            "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500":
              variant === "primary",
            "bg-dark-700 text-white hover:bg-dark-600 focus:ring-dark-500":
              variant === "secondary",
            "bg-transparent text-dark-300 hover:text-white hover:bg-dark-800 focus:ring-dark-500":
              variant === "ghost",
            "bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-500":
              variant === "danger",
            // Sizes
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

