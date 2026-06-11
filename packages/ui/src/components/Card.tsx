import type { HTMLAttributes } from "react";

/** Standard surface used across the suite (landing cards, module panels). */
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-neobrutal border-thick border-brand-border bg-brand-background shadow-neo-lg ${className}`}
      {...props}
    />
  );
}
