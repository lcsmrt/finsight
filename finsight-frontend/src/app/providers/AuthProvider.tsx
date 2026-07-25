import { setAccessTokenAccessor } from "@/api/clients/finsightApi";
import { useGetUserProfile } from "@/api/services/useAuthService";
import { User } from "@/api/dtos/user";
import {
  getItemFromStorage,
  removeItemFromStorage,
  STORAGE_KEYS,
  storeItem,
} from "@/lib/storage";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

type AuthContextParams = {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  setAccessToken: Dispatch<SetStateAction<string | null>>;
  isInitializing: boolean;
};

const AuthContext = createContext<AuthContextParams>({
  user: null,
  setUser: () => {},
  setAccessToken: () => {},
  isInitializing: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(
    getItemFromStorage(STORAGE_KEYS.accessToken),
  );
  const [isInitializing, setIsInitializing] = useState(!!accessToken);

  const { refetch: getUserProfile } = useGetUserProfile();

  useEffect(() => {
    setAccessTokenAccessor(() => accessToken);
    if (accessToken) {
      storeItem(STORAGE_KEYS.accessToken, accessToken);
      loadUserData(accessToken);
    } else {
      removeItemFromStorage(STORAGE_KEYS.accessToken);
      setUser(null);
      setIsInitializing(false);
    }
  }, [accessToken]);

  const loadUserData = async (currentToken: string) => {
    if (!currentToken) return;

    await getUserProfile()
      .then(({ data: userProfile }) => {
        if (userProfile) setUser(userProfile);
      })
      .catch(() => {
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => {
        setIsInitializing(false);
      });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, setAccessToken, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("The useAuth hook must be used within a AuthProvider");
  return context;
};
