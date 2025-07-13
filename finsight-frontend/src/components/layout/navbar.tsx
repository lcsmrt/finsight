import { Avatar, AvatarFallback } from "@/components/avatar/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown/dropdown";
import { LogOut } from "lucide-react";
import { clearStorage } from "@/lib/storage";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/app/routing/paths";
import { useUser } from "@/app/providers/userProvider";
import { getFirstAndLastInitials } from "lcs-utils";

export const Navbar = () => {
  const navigate = useNavigate();

  const { user } = useUser();

  const logout = () => {
    clearStorage();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <nav className="border-border fixed flex w-full items-center justify-between border-b p-4">
      <h2 className="text-primary text-xl font-bold">FinSight</h2>

      <DropdownMenu>
        <DropdownMenuTrigger className="hover:cursor-pointer focus:outline-none">
          <Avatar>
            <AvatarFallback>
              {getFirstAndLastInitials(user?.name ?? "")}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem
            className="hover:bg-muted flex h-full w-full items-center justify-between gap-2 hover:cursor-pointer"
            onClick={logout}
          >
            LogOut
            <LogOut className="text-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
