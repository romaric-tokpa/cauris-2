import { useRef } from "react";
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> };

/**
 * Port de .tap (transform: scale(.96), transition .12s ease sur :active) —
 * retour tactile utilisé sur toutes les cartes/boutons du redesign.
 *
 * Un seul composant animé (pas de Pressable > Animated.View imbriqué) : `style`
 * doit à la fois participer au flex du parent (flex:1, width:"25%") ET arranger
 * les enfants directs (flexDirection:"row", gap, padding). Avec deux niveaux
 * imbriqués, ces deux rôles retombent sur des éléments différents et l'un des
 * deux casse toujours — vu sur la grille Actions rapides (largeur non imposée)
 * puis sur les lignes du menu Plus (icône/texte/chevron empilés en colonne
 * faute de flexDirection sur le vrai conteneur des enfants).
 */
export default function Tap({ style, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn(e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]) {
    Animated.timing(scale, { toValue: 0.96, duration: 120, useNativeDriver: true }).start();
    onPressIn?.(e);
  }
  function pressOut(e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]) {
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    onPressOut?.(e);
  }

  return (
    <AnimatedPressable style={[style, { transform: [{ scale }] }]} onPressIn={pressIn} onPressOut={pressOut} {...rest}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
