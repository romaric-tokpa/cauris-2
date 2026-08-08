import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/** Vrai tant que l'appareil a une connexion réseau utilisable — se met à jour en direct (WiFi/données coupées, avion, reconnexion). */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  return online;
}
