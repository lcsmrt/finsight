import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export const SectionHeader = ({
  title,
  subtitle,
  children,
}: SectionHeaderProps) => {
  return (
    <div className="flex w-full items-center justify-between px-2">
      <div className="flex flex-col gap-1">
        <span className="text-md font-semibold">{title}</span>
        {subtitle && (
          <span className="text-muted-foreground text-xs">{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
};
