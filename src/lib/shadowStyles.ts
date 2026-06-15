export const SHADOW = {
  // Resting shadows are intentionally visible, inspired by the navbar/header.
  // They use the brand `primary` color at low opacity so the shadow reads as
  // depth, not a tinted halo.
  cardBase: "shadow-lg shadow-primary/12",
  cardHover: "hover:shadow-xl hover:shadow-primary/16",
  cardGroupHover: "group-hover:shadow-xl group-hover:shadow-primary/16",

  accentBase: "shadow-lg shadow-primary/12",
  accentHover: "hover:shadow-xl hover:shadow-primary/16",

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
