import { mergeClasses } from "@/lib/mergeClasses";
import { ReactNode } from "react";

export type FieldWrapperProps = {
  label?: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

export const FieldWrapper = ({
  label,
  htmlFor,
  description,
  error,
  className,
  children,
}: FieldWrapperProps) => {
  return (
    <div className={mergeClasses("space-y-1", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-foreground text-sm font-medium"
        >
          {label}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
};
