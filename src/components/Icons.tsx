import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

// DayFeed's line-art icon set (v1.4): thin single-color strokes on a 24×24
// grid, replacing the emoji glyphs so every icon tints with the theme. Strokes
// stay at 1.6 so the set reads as one pen.

export interface IconProps {
  size?: number;
  color: string;
  /** Stroke width override — the mic button uses a heavier line at large sizes. */
  strokeWidth?: number;
}

const S = 1.6;

/** Feed — speech bubble. */
export function SpeechBubbleIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5v7c0 1.4-1.1 2.5-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16 6.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="8" y1="12.5" x2="13.5" y2="12.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Flip — open book. */
export function OpenBookIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5c-.8 0-1.5.7-1.5 1.5v11c0 .8.7 1.5 1.5 1.5 3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2 .8 0 1.5-.7 1.5-1.5V6c0-.8-.7-1.5-1.5-1.5-3 0-5 .5-6.5 2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Line x1="12" y1="6.5" x2="12" y2="20.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Flop — stack of bound books. */
export function BookStackIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="4" width="14" height="4.5" rx="1" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="3.5" y="9.75" width="17" height="4.5" rx="1" stroke={color} strokeWidth={strokeWidth} />
      <Rect x="6" y="15.5" width="14" height="4.5" rx="1" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Agenda — calendar. */
export function CalendarIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="4" y1="10" x2="20" y2="10" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="8.5" y1="3.5" x2="8.5" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="15.5" y1="3.5" x2="15.5" y2="7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Circle cx="9" cy="14" r="1" fill={color} />
      <Circle cx="15" cy="14" r="1" fill={color} />
    </Svg>
  );
}

/** View All — stacked index cards. */
export function CardStackIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M6.5 8V6.5C6.5 5.7 7.2 5 8 5h8c.8 0 1.5.7 1.5 1.5V8" stroke={color} strokeWidth={strokeWidth} />
      <Line x1="7.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="7.5" y1="15.5" x2="13.5" y2="15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Capture bar / composers — microphone. */
export function MicIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="9" y="3.5" width="6" height="11" rx="3" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1="12" y1="18" x2="12" y2="20.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Capture bar — camera. */
export function CameraIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5C4 7.7 4.7 7 5.5 7h2l1.2-1.8c.3-.4.7-.7 1.2-.7h4.2c.5 0 .9.3 1.2.7L16.5 7h2c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5h-13c-.8 0-1.5-.7-1.5-1.5v-9Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="13" r="3.2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** Agenda rows — reminder bell. */
export function BellIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-2 6.3-.3.5 0 1.2.7 1.2h13.6c.7 0 1-.7.7-1.2-.5-.8-2-2.3-2-6.3A5.5 5.5 0 0 0 12 4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path d="M10 19.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Filled variant for a bell that is switched on. */
export function BellFilledIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.5 5.5-2 6.3-.3.5 0 1.2.7 1.2h13.6c.7 0 1-.7.7-1.2-.5-.8-2-2.3-2-6.3A5.5 5.5 0 0 0 12 4Z"
        fill={color}
        stroke={color}
        strokeWidth={S}
        strokeLinejoin="round"
      />
      <Path d="M10 19.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={S} strokeLinecap="round" />
    </Svg>
  );
}

/** Theme toggle — crescent moon (shown in light mode: "switch to night"). */
export function MoonIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19.5 14.2A7.8 7.8 0 0 1 9.8 4.5 7.8 7.8 0 1 0 19.5 14.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Theme toggle — sun (shown in dark mode: "switch to day"). */
export function SunIcon({ size = 22, color, strokeWidth = S }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth={strokeWidth} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = (deg * Math.PI) / 180;
        const x1 = 12 + Math.cos(r) * 6.2;
        const y1 = 12 + Math.sin(r) * 6.2;
        const x2 = 12 + Math.cos(r) * 8.2;
        const y2 = 12 + Math.sin(r) * 8.2;
        return (
          <Line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

/** Markdown checkbox lines — empty square, or filled with a checkmark. */
export function CheckboxIcon({
  size = 20,
  color,
  strokeWidth = S,
  checked = false,
}: IconProps & { checked?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        stroke={color}
        strokeWidth={strokeWidth}
        fill={checked ? color : 'none'}
      />
      {checked && (
        <Path
          d="M7 12.3l3.2 3.2L17.3 8.3"
          stroke="#fff"
          strokeWidth={strokeWidth + 0.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}
