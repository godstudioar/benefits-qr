export type FieldHelpState = {
  hasFocus: boolean;
  isHovered: boolean;
  isPinned: boolean;
  isDismissed: boolean;
};

export type FieldHelpEvent =
  | { type: "focus"; active: boolean }
  | { type: "hover"; active: boolean }
  | { type: "toggle-pin" }
  | { type: "close" };

export const initialFieldHelpState: FieldHelpState = {
  hasFocus: false,
  isHovered: false,
  isPinned: false,
  isDismissed: false,
};

export function isFieldHelpOpen(state: FieldHelpState) {
  if (state.isPinned) {
    return true;
  }

  return !state.isDismissed && (state.hasFocus || state.isHovered);
}

function resetDismissalWhenIdle(state: FieldHelpState) {
  if (state.hasFocus || state.isHovered) {
    return state;
  }

  return { ...state, isDismissed: false };
}

export function reduceFieldHelpState(state: FieldHelpState, event: FieldHelpEvent): FieldHelpState {
  switch (event.type) {
    case "focus": {
      const shouldResetDismissal = event.active && !state.hasFocus && !state.isHovered;

      return resetDismissalWhenIdle({
        ...state,
        hasFocus: event.active,
        isDismissed: shouldResetDismissal ? false : state.isDismissed,
      });
    }

    case "hover": {
      const shouldResetDismissal = event.active && !state.hasFocus && !state.isHovered;

      return resetDismissalWhenIdle({
        ...state,
        isHovered: event.active,
        isDismissed: shouldResetDismissal ? false : state.isDismissed,
      });
    }

    case "toggle-pin":
      if (state.isPinned) {
        return {
          ...state,
          isPinned: false,
          isDismissed: state.hasFocus || state.isHovered,
        };
      }

      return {
        ...state,
        isPinned: true,
        isDismissed: false,
      };

    case "close":
      return resetDismissalWhenIdle({
        ...state,
        isPinned: false,
        isDismissed: state.hasFocus || state.isHovered,
      });
  }
}
