import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-left"
      closeButton
      icons={{
        success: (
          <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <CircleCheckIcon className="size-4" />
          </div>
        ),
        info: (
          <div className="flex size-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-600">
            <InfoIcon className="size-4" />
          </div>
        ),
        warning: (
          <div className="flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <TriangleAlertIcon className="size-4" />
          </div>
        ),
        error: (
          <div className="flex size-6 items-center justify-center rounded-full bg-red-500/15 text-red-600">
            <OctagonXIcon className="size-4" />
          </div>
        ),
        loading: (
          <div className="bg-muted flex size-6 items-center justify-center rounded-full">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group flex items-start gap-3 rounded-md border bg-popover px-4 py-3 shadow-md",
          icon: "mt-0.5 flex shrink-0 items-center justify-center rounded-full",
          title: "text-sm font-medium ml-1",
          description: "text-xs text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
