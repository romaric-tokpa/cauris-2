import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Path, Polyline, Stop, Text as SvgText } from "react-native-svg";
import { fmt } from "../lib/format";
import { useColors } from "../lib/prefs";
import { fonts, type ThemeColors } from "../lib/theme";

type Point = { date: string; valo: number; invest: number };
type Props = { series: Point[] };

const W = 320;
const H = 190;
const PAD_L = 44;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;
const BASE = H - PAD_B;

/** Port de buildBrvmChart() dans public/app.js:413-445 (valorisation vs investi, un point par relevé de cours). */
export default function PortfolioChart({ series }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (series.length < 2) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>Mets à jour tes cours chaque mois pour voir ta courbe se construire.</Text>
      </View>
    );
  }

  const n = series.length;
  const vals = series.flatMap((s) => [s.valo, s.invest]);
  const maxY = Math.max(1, ...vals);
  const minY = Math.min(...vals);
  const span = maxY - minY || maxY || 1;
  const lo = minY - span * 0.12;
  const hi = maxY + span * 0.12;
  const range = hi - lo || 1;
  const x = (i: number) => PAD_L + (i * (W - PAD_L - PAD_R)) / (n - 1);
  const y = (v: number) => BASE - ((v - lo) / range) * (H - PAD_T - PAD_B);

  const up = series[n - 1].valo >= series[0].valo;
  const lineColor = up ? colors.green : colors.red;
  const investColor = colors.muted2;

  const lineV = series.map((s, i) => `${x(i).toFixed(1)},${y(s.valo).toFixed(1)}`).join(" ");
  const lineI = series.map((s, i) => `${x(i).toFixed(1)},${y(s.invest).toFixed(1)}`).join(" ");
  const areaV = `M ${x(0).toFixed(1)},${BASE} L ${lineV} L ${x(n - 1).toFixed(1)},${BASE} Z`;
  const grid = [0, 0.5, 1].map((f) => BASE - f * (H - PAD_T - PAD_B));
  const step = Math.ceil(n / 6);

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: lineColor }]} />
          <Text style={styles.legendText}>Valorisation</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: investColor }]} />
          <Text style={styles.legendText}>Investi</Text>
        </View>
      </View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {grid.map((gy, i) => (
          <Line key={i} x1={PAD_L} y1={gy} x2={W - PAD_R} y2={gy} stroke={colors.lineSoft} strokeWidth={1} />
        ))}
        <SvgText x={PAD_L - 6} y={PAD_T + 4} fontSize={9} fill={colors.muted2} textAnchor="end">
          {fmt(hi)}
        </SvgText>
        <SvgText x={PAD_L - 6} y={BASE} fontSize={9} fill={colors.muted2} textAnchor="end">
          {fmt(lo)}
        </SvgText>
        <Path d={areaV} fill="url(#portfolioGrad)" />
        <Polyline points={lineI} fill="none" stroke={investColor} strokeWidth={1.6} strokeDasharray="4,3" strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={lineV} fill="none" stroke={lineColor} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {series.map((s, i) => (
          <Circle key={i} cx={x(i)} cy={y(s.valo)} r={3} fill={lineColor} />
        ))}
        {series.map((s, i) =>
          i % step === 0 || i === n - 1 ? (
            <SvgText key={i} x={x(i)} y={H - 6} fontSize={9} fill={colors.muted2} textAnchor="middle">
              {s.date}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    legend: { flexDirection: "row", gap: 16, marginBottom: 8 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: fonts.sans, fontSize: 11, color: colors.muted2 },
    emptyBox: { paddingVertical: 20, alignItems: "center" },
    emptyText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.muted, textAlign: "center" },
  });
}
