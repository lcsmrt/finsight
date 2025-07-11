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

export const Navbar = () => {
  const navigate = useNavigate();

  const logout = () => {
    clearStorage();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="border-border flex w-full items-center justify-between border-b p-4">
      <h2 className="text-primary text-xl font-bold">FinSight</h2>

      <DropdownMenu>
        <DropdownMenuTrigger className="hover:cursor-pointer focus:outline-none">
          <Avatar>
            <AvatarFallback>LS</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuItem
            className="hover:bg-muted flex h-full w-full items-center justify-between gap-2 hover:cursor-pointer"
            onClick={logout}
          >
            LogOut
            <LogOut />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
