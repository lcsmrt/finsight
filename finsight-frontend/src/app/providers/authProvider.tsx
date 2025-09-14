import { setAccessTokenAccessor } from "@/api/clients/expansesManagerApi";
import { useGetUserProfile } from "@/api/services/authService";
import { User } from "@/api/types/user";
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
  isInitializing: boolean;
};

const AuthContext = createContext<AuthContextParams>({
  user: null,
  setUser: () => {},
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
    try {
      if (!currentToken) return;
      const { data: userProfile } = await getUserProfile();
      if (!userProfile) return;
      setUser(userProfile);
    } catch (error) {
      console.error("Error loading user data:", error);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, isInitializing }}>
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
