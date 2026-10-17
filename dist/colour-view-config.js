// Keep the 2D implementation and its deep links intact for a future restore.
// Set this to true to expose the two dimension buttons again.
export const COLOUR_HUE_ENABLED = false;
export const DEFAULT_COLOUR_VIEW = 'colour';

export function resolveColourView(view, hueEnabled = COLOUR_HUE_ENABLED) {
  return view === 'hue' && !hueEnabled ? DEFAULT_COLOUR_VIEW : view;
}
