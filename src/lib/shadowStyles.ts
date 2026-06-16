// Base shadow values shared by semantic aliases. Keeping the raw strings here
// makes it obvious that `card*` and `accent*` share the same resting/hover
// elevation; they are kept as separate names so call sites describe intent.
const CARD_BASE = "shadow-lg shadow-primary/12";
const CARD_HOVER = "hover:shadow-xl hover:shadow-primary/16";

export const SHADOW = {
  // Default content cards (grids, lists, filters).
  cardBase: CARD_BASE,
  cardHover: CARD_HOVER,
  cardGroupHover: "group-hover:shadow-xl group-hover:shadow-primary/16",

  // Accent surfaces that should stand out slightly from the page background
  // (CTAs, metric cards, dashboard highlights). Currently shares the card
  // elevation scale; increase opacity here if accent surfaces need more depth.
  accentBase: CARD_BASE,
  accentHover: CARD_HOVER,

  // Hero / large focal elements above the content plane.
  focalBase: "shadow-xl shadow-primary/16",

  heroBase: "shadow-2xl shadow-primary/20",
  heroHover: "hover:shadow-2xl hover:shadow-primary/24",
} as const;

export const INTERACTION = {
  hoverLift:
    "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
  groupHoverLift:
    "transition-[transform,box-shadow,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25",
} as const;
