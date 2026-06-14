import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

/** Standard surface used across the suite (landing cards, module panels). */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className = "", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={`rounded-neobrutal border-thick border-brand-border bg-brand-background shadow-neo-lg ${className}`}
        {...props}
      />
    );
  }
);
