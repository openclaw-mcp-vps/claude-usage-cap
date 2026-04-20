import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-[#2f81f7] text-[#f0f6fc] hover:bg-[#1f6feb] border border-[#2f81f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f81f7]/50",
  outline:
    "bg-transparent text-[#e6edf3] border border-[#30363d] hover:border-[#2f81f7] hover:text-[#2f81f7]",
  ghost: "bg-transparent text-[#e6edf3] border border-transparent hover:bg-[#161b22]",
  danger:
    "bg-[#f85149] text-white border border-[#f85149] hover:bg-[#da3633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f85149]/50"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});
