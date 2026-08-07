import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

/** Anime un nombre de 0 jusqu'à `target` (comptage progressif), pour les montants/pourcentages « hero » affichés en grand plutôt que sautant directement à leur valeur. */
export function useCountUp(target: number, duration = 900): number {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value }) => setDisplay(value));
    Animated.timing(anim, { toValue: target, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [target, duration, anim]);

  return display;
}
