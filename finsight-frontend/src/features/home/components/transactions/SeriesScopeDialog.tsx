import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";
import { Button } from "@/components/button/Button";
import { Field, FieldLabel } from "@/components/input/base/Field";
import { RadioGroup, RadioGroupItem } from "@/components/input/base/RadioGroup";
import { SeriesEditScope } from "@/api/dtos/financialTransaction";

interface ScopeOption {
  value: SeriesEditScope;
  label: string;
  helperText: string;
}

const SCOPE_OPTIONS: ScopeOption[] = [
  {
    value: "THIS_ONE",
    label: "This one",
    helperText: "Only this occurrence will be changed.",
  },
  {
    value: "THIS_AND_FOLLOWING",
    label: "This and following",
    helperText: "This and all future occurrences will be changed. Past occurrences stay the same.",
  },
  {
    value: "ALL",
    label: "All",
    helperText: "Every occurrence in the series will be changed, including past ones.",
  },
];

interface SeriesScopeDialogContextValue {
  chooseScope: () => Promise<SeriesEditScope | null>;
}

const SeriesScopeDialogContext = createContext<SeriesScopeDialogContextValue | null>(null);

export const useSeriesScope = () => {
  const context = useContext(SeriesScopeDialogContext);
  if (!context) {
    throw new Error("useSeriesScope must be used within SeriesScopeDialogProvider");
  }
  return context.chooseScope;
};

export const SeriesScopeDialogProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<SeriesEditScope>("THIS_ONE");
  const [resolver, setResolver] = useState<((value: SeriesEditScope | null) => void) | null>(null);

  const chooseScope = (): Promise<SeriesEditScope | null> => {
    setScope("THIS_ONE");
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleContinue = () => {
    resolver?.(scope);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolver?.(null);
    setIsOpen(false);
  };

  return (
    <SeriesScopeDialogContext.Provider value={{ chooseScope }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader className="gap-4">
            <DialogTitle>Edit series</DialogTitle>
            <DialogDescription>Choose what to apply this change to.</DialogDescription>
          </DialogHeader>
          <RadioGroup value={scope} onValueChange={(value) => setScope(value as SeriesEditScope)}>
            {SCOPE_OPTIONS.map((option) => (
              <FieldLabel key={option.value} htmlFor={option.value}>
                <Field orientation="horizontal">
                  <RadioGroupItem id={option.value} value={option.value} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-sm">{option.helperText}</span>
                  </div>
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleContinue}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SeriesScopeDialogContext.Provider>
  );
};
