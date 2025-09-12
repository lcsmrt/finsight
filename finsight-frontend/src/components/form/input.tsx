import { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { FieldWrapper, FieldWrapperProps } from "./fieldWrapper";
import { mergeClasses } from "@/lib/mergeClasses";

type InputProps = Omit<FieldWrapperProps, "className" | "children"> &
  InputHTMLAttributes<HTMLInputElement> & {
    wrapperClassName?: string;
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
  };

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      label,
      error,
      description,
      iconLeft,
      iconRight,
      id,
      ...props
    },
    ref,
  ) => {
    return (
      <FieldWrapper
        htmlFor={id}
        label={label}
        error={error}
        description={description}
        className={wrapperClassName}
      >
        <div className="relative">
          {iconLeft && (
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              {iconLeft}
            </span>
          )}
          <input
            className={mergeClasses(
              "border-input ring-offset-background flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
              "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              iconLeft && "pl-11",
              iconRight && "pr-11",
              error && "border-destructive",
              className,
            )}
            type="text"
            ref={ref}
            {...props}
          />
          {iconRight && (
            <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
              {iconRight}
            </span>
          )}
        </div>
      </FieldWrapper>
    );
  },
);

Input.displayName = "Input";

export { Input };
