import { cn } from "@/lib/utils";
import { ReactNode, MouseEventHandler } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  onClick?: MouseEventHandler<HTMLSpanElement>;
}

export function Badge({ children, variant = "default", className, onClick }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        {
          "bg-dark-700 text-dark-300": variant === "default",
          "bg-green-500/10 text-green-400": variant === "success",
          "bg-yellow-500/10 text-yellow-400": variant === "warning",
          "bg-red-500/10 text-red-400": variant === "danger",
          "bg-blue-500/10 text-blue-400": variant === "info",
        },
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

