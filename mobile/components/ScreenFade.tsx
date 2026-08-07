import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

/** Port de @keyframes scrIn (fade + translateY(8px), 280ms ease) — rejoué à chaque prise de focus de l'écran, comme switchTab() dans le redesign. */
export default function ScreenFade({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(8);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, [opacity, translateY]),
  );

  return <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}
