import { cn } from "@/lib/mergeClasses";

type AppVersionProps = {
  className?: string;
};

export const AppVersion = ({ className }: AppVersionProps) => (
  <span className={cn("text-muted-foreground text-xs", className)}>
    v{__APP_VERSION__} - {__APP_BUILD_DATE__}
  </span>
);
