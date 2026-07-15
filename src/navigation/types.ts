import type { NavigatorScreenParams } from '@react-navigation/native';

// Shared param list for the bottom tabs. Flip accepts an optional jump target so
// the Agenda tab can deep-link to a specific day page (ts forces re-navigation to
// the same day). Five tabs is the platform maximum — no further tabs after Flop.
export type RootTabParamList = {
  Feed: undefined;
  Flip: { jumpTo?: string; ts?: number } | undefined;
  Flop: NavigatorScreenParams<FlopStackParamList> | undefined;
  All: undefined;
  Agenda: undefined;
};

// Flop drills in one level per screen, to unlimited depth: every FlopNote push
// stacks another page, and the breadcrumb pops back to any ancestor.
export type FlopStackParamList = {
  FlopList: undefined;
  FlopNote: { id: string };
};
