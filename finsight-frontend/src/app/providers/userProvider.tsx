import { User } from "@/api/types/authTypes";
import { createContext, ReactNode, useContext, useState } from "react";

type UserContextParams = {
  user: User | null;
  setUser: (user: User) => void;
};

const UserContext = createContext<UserContextParams>({
  user: null,
  setUser: () => {},
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("O hook useUser deve ser usado dentro de um UserProvider");
  return context;
};
