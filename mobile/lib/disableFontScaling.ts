import { Text, TextInput } from "react-native";

/**
 * Les mises en page de l'app (grille d'actions 4 colonnes, chiffres des
 * coffres, tab bar) sont calibrées en tailles fixes façon design system —
 * pas prévues pour s'adapter au réglage "taille de texte" du téléphone.
 * Sans ça, un réglage d'accessibilité élevé casse ces grilles (texte qui se
 * coupe lettre par lettre, chiffres qui se chevauchent). On fige donc
 * l'échelle de police une fois, au démarrage.
 */
type DefaultProps = { defaultProps?: { allowFontScaling?: boolean } };

((Text as unknown) as DefaultProps).defaultProps = { ...((Text as unknown) as DefaultProps).defaultProps, allowFontScaling: false };
((TextInput as unknown) as DefaultProps).defaultProps = { ...((TextInput as unknown) as DefaultProps).defaultProps, allowFontScaling: false };
