import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useColors } from "../lib/prefs";

type Point = { cours: number; date: string; ts: number };
type Props = { points: Point[]; width?: number; height?: number };

/** Mini-graphe de cours, port de sparkline() dans public/app.js:447-454. */
export default function Sparkline({ points, width = 72, height = 24 }: Props) {
  const colors = useColors();
  if (points.length < 2) return null;
  const p = 2;
  const xs = points.map((_, i) => p + (i * (width - 2 * p)) / (points.length - 1));
  const ys = points.map((pt) => pt.cours);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const y = (v: number) => height - p - ((v - min) / span) * (height - 2 * p);
  const line = points.map((pt, i) => `${xs[i].toFixed(1)},${y(pt.cours).toFixed(1)}`).join(" ");
  const up = ys[ys.length - 1] >= ys[0];
  const color = up ? colors.green : colors.red;

  return (
    <View>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}
