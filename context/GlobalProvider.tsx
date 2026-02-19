import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { account } from "../lib/appwrite";
import { Models } from "react-native-appwrite";

// Define the shape of our Context
interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: Models.User<Models.Preferences> | null;
  setUser: (user: Models.User<Models.Preferences> | null) => void;
  loading: boolean;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) throw new Error("useGlobalContext must be used within a GlobalProvider");
  return context;
};

export const GlobalProvider = ({ children }: { children: ReactNode }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const res = await account.get();
      if (res) {
        setIsLogged(true);
        setUser(res);
      } else {
        setIsLogged(false);
        setUser(null);
      }
    } catch (error) {
      console.log("No active session:", error);
      setIsLogged(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;