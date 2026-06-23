import assert from "node:assert/strict";
import test from "node:test";

import {
  initialFieldHelpState,
  isFieldHelpOpen,
  reduceFieldHelpState,
} from "@/components/ui/fieldHelpState";

test("field help click-close wins over active hover and focus until interaction resets", () => {
  let state = reduceFieldHelpState(initialFieldHelpState, { type: "hover", active: true });
  state = reduceFieldHelpState(state, { type: "focus", active: true });

  assert.equal(isFieldHelpOpen(state), true);

  state = reduceFieldHelpState(state, { type: "toggle-pin" });
  assert.equal(isFieldHelpOpen(state), true);

  state = reduceFieldHelpState(state, { type: "toggle-pin" });
  assert.equal(isFieldHelpOpen(state), false);

  state = reduceFieldHelpState(state, { type: "hover", active: false });
  assert.equal(isFieldHelpOpen(state), false);

  state = reduceFieldHelpState(state, { type: "focus", active: false });
  assert.equal(isFieldHelpOpen(state), false);

  state = reduceFieldHelpState(state, { type: "hover", active: true });
  assert.equal(isFieldHelpOpen(state), true);
});

test("field help external close keeps transient help dismissed until focus or hover fully leaves", () => {
  let state = reduceFieldHelpState(initialFieldHelpState, { type: "focus", active: true });
  assert.equal(isFieldHelpOpen(state), true);

  state = reduceFieldHelpState(state, { type: "close" });
  assert.equal(isFieldHelpOpen(state), false);

  state = reduceFieldHelpState(state, { type: "focus", active: false });
  state = reduceFieldHelpState(state, { type: "focus", active: true });

  assert.equal(isFieldHelpOpen(state), true);
});
