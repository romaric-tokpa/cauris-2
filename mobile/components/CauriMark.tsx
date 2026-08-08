import Svg, { Ellipse } from "react-native-svg";

/** Logo Cauris — empilement de cauris stylisé, réutilisé sur l'écran de connexion et l'écran de chargement. */
export default function CauriMark({ size = 52 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 66) / 70} viewBox="0 0 70 66">
      <Ellipse cx={35} cy={52} rx={26} ry={8} fill="#6C737B" />
      <Ellipse cx={35} cy={40} rx={24} ry={8} fill="#9199A3" />
      <Ellipse cx={35} cy={28} rx={20} ry={7} fill="#F2C200" />
      <Ellipse cx={35} cy={17} rx={15} ry={6} fill="#F5F3EF" />
    </Svg>
  );
}
