import { cn } from "@/lib/mergeClasses";
import type { Row } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../dropdown/Dropdown";
import { EllipsisVertical } from "lucide-react";

export interface ColumnAction {
  label: string;
  onClick: (...args: any) => void;
  icon?: React.ReactNode;
  conditionalRenderingFunctions?: ((...args: any) => boolean)[];
}

interface ColumnActionDropdownProps {
  columnActions?: ColumnAction[];
  row: Row<any>;
  subtle?: boolean;
}

export const TableActionsDropdown = ({ columnActions, row, subtle }: ColumnActionDropdownProps) => {
  const filteredActions = columnActions?.filter((action) => {
    if (!action.conditionalRenderingFunctions) return true;
    return action.conditionalRenderingFunctions.every((fn) => fn(row.original));
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-muted-foreground/10 flex h-7 w-7 items-center justify-center rounded-full">
        <EllipsisVertical
          className={cn(
            "inline-block h-4 w-4",
            subtle && "text-muted-foreground/50 hover:text-foreground",
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {filteredActions?.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onSelect={(e) => {
              e.preventDefault();
              action.onClick(row);
            }}
          >
            <div className="flex w-full items-center gap-2 hover:cursor-pointer">
              {action.icon}
              {action.label}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
