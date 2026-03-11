import Svg, { Path } from "react-native-svg";

export function FingerprintIcon({ size = 20, color = "#000" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M14 13.12c0 2.38-.16 4.42-.46 6.14"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M17.29 21.02c.12-.6.43-2.3.5-3.4a10 10 0 0 0 .21-2.1 5.98 5.98 0 0 0-6-5.52 5.98 5.98 0 0 0-6 5.52c0 .68-.12 1.7-.3 2.76"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M2 12a10 10 0 0 1 18-6"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M2 16.13C2.76 21.35 6.94 24 12 24c.71 0 1.41-.05 2.09-.15"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M21.8 15.52A10 10 0 0 0 22 12a9.97 9.97 0 0 0-2-6"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M7 3.37A10 10 0 0 1 22 12"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}
