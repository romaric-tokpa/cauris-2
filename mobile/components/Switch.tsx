import { useEffect, useRef } from "react";
import { Animated, Pressable } from "react-native";
import { useColors } from "../lib/prefs";

/** Port de .sw() du redesign (pilule 44×26, pastille blanche coulissante). */
export default function Switch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const colors = useColors();
  const t = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, t]);

  const bg = t.interpolate({ inputRange: [0, 1], outputRange: [colors.segmentOff, colors.green] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: bg, padding: 3, justifyContent: "center" }}>
        <Animated.View
          style={{
            width: 20,
            height: 20,
            borderRadius: 999,
            backgroundColor: "#fff",
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
