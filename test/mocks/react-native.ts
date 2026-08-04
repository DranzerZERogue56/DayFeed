// Minimal react-native stand-in for the node test environment.
//
// The unit tests are node-only and never render, but a few pure modules import
// the theme, which reaches for Platform.select to pick font families. Mapping
// the whole of react-native here is cheaper than either shipping a full RN test
// environment or contorting src/theme.ts to avoid the import.
export const Platform = {
  OS: 'android' as const,
  select<T>(spec: { ios?: T; android?: T; default?: T }): T | undefined {
    return spec.android ?? spec.default;
  },
};

export const StyleSheet = {
  create<T extends Record<string, unknown>>(styles: T): T {
    return styles;
  },
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};
