import { Avatar, AvatarFallback } from "@/components/avatar/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../dropdown/Dropdown";
import { LogOut } from "lucide-react";
import { clearStorage } from "@/lib/storage";
import { useNavigate } from "react-router-dom";
import { PATHS } from "@/app/routing/paths";
import { useAuth } from "@/app/providers/AuthProvider";
import { getFirstAndLastInitials } from "@/utils/string/formatters";

export const Navbar = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const logout = () => {
    clearStorage();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <nav className="border-border fixed flex h-16 w-full items-center justify-between border-b px-4">
      <img src={"/finsigh-icon.png"} alt="FinSight Logo" className="h-8" />

      <DropdownMenu>
        <DropdownMenuTrigger className="hover:cursor-pointer focus:outline-none">
          <Avatar size="lg">
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
            Logout
            <LogOut className="text-foreground" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
