import Svg, { Path } from "react-native-svg";

export function FaceIdIcon({ size = 20, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Top-left corner */}
      <Path d="M2 8V5a3 3 0 0 1 3-3h3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Top-right corner */}
      <Path d="M16 2h3a3 3 0 0 1 3 3v3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom-right corner */}
      <Path d="M22 16v3a3 3 0 0 1-3 3h-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Bottom-left corner */}
      <Path d="M8 22H5a3 3 0 0 1-3-3v-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Left eye */}
      <Path d="M9 9v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Right eye */}
      <Path d="M15 9v2" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Smile */}
      <Path d="M9.5 15a3.5 3.5 0 0 0 5 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
