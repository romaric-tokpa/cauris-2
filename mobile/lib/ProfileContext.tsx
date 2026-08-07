import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { UnauthorizedError } from "./api";
import { useAuth } from "./AuthContext";
import { fetchProfilePhoto, getCachedProfilePhoto } from "./profile";

type ProfileCtx = {
  photo: string | null;
  setPhoto: (photo: string | null) => void;
};

const ProfileContext = createContext<ProfileCtx | null>(null);

/** Photo de profil partagée entre tous les écrans (Accueil, Plus…) — un seul fetch, mis à jour partout après upload/suppression. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, logout } = useAuth();
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setPhoto(null);
      return;
    }
    getCachedProfilePhoto().then(setPhoto);
    fetchProfilePhoto()
      .then(setPhoto)
      .catch((e) => {
        if (e instanceof UnauthorizedError) logout();
      });
  }, [isLoggedIn, logout]);

  return <ProfileContext.Provider value={{ photo, setPhoto }}>{children}</ProfileContext.Provider>;
}

export function useProfilePhoto(): ProfileCtx {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfilePhoto doit être utilisé sous ProfileProvider.");
  return ctx;
}
