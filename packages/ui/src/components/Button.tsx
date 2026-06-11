import type { ButtonHTMLAttributes } from "react";

/** Primary action button with the suite's brand styling. */
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-neobrutal border-thick border-brand-border bg-brand-primary px-5 py-2.5 font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow,background-color] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-neo-md ${className}`}
      {...props}
    />
  );
}
