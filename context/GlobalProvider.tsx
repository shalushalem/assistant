import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { account, databases, appwriteConfig } from "../lib/appwrite";
import { Query } from "react-native-appwrite";

interface GlobalContextType {
  isLogged: boolean;
  setIsLogged: (value: boolean) => void;
  user: any | null; 
  setUser: (user: any | null) => void;
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
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    try {
      const currentAccount = await account.get();
      
      if (currentAccount) {
        // FETCH THE DB DOCUMENT, NOT JUST THE AUTH ACCOUNT
        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId!,
            appwriteConfig.userCollectionId!,
            [Query.equal("accountId", currentAccount.$id)]
        );

        if (currentUser.documents.length > 0) {
            setIsLogged(true);
            setUser(currentUser.documents[0]); 
        } else {
            setIsLogged(true);
            setUser(currentAccount);
        }
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