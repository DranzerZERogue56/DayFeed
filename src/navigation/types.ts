// Shared param list for the bottom tabs. Flip accepts an optional jump target so
// the Agenda tab can deep-link to a specific day page (ts forces re-navigation to
// the same day).
export type RootTabParamList = {
  Feed: undefined;
  Flip: { jumpTo?: string; ts?: number } | undefined;
  All: undefined;
  Agenda: undefined;
};
