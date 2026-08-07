import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { brandFor, type BrandIcon } from "../lib/brand";
import { useColors } from "../lib/prefs";

type Props = { nom: string; type: string; size?: number };

function BrandGlyph({ icon, size, color }: { icon: BrandIcon; size: number; color: string }) {
  if (icon === "bank") return <MaterialCommunityIcons name="bank" size={size} color={color} />;
  const name = icon === "phone" ? "smartphone" : icon === "cash" ? "dollar-sign" : icon === "safe" ? "lock" : "trending-up";
  return <Feather name={name} size={size} color={color} />;
}

/** Port de acbadge/brandFor() dans public/app.js — logo si connu (Wave, Orange Money, Djamo, SGBCI), sinon icône de type sur fond coloré. */
export default function AccountLogo({ nom, type, size = 36 }: Props) {
  const colors = useColors();
  const brand = brandFor(nom, type);
  const radius = Math.round(size * 0.28);

  if (brand.logo) {
    return (
      <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.lineSoft }]}>
        <Image source={brand.logo} style={{ width: size * 0.72, height: size * 0.72 }} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: brand.color }]}>
      <BrandGlyph icon={brand.icon} size={Math.round(size * 0.5)} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
