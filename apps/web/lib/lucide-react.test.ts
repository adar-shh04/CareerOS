import assert from "node:assert/strict";
import test from "node:test";

import * as lucide from "lucide-react";

const icons = lucide as unknown as Record<string, unknown>;

void test("lucide-react provides the 1.74.0 icon exports used by the web app", () => {
  // Icons added in lucide-react 1.74.0.
  for (const name of [
    "NigerianNaira",
    "HouseArrowLeft",
    "HouseArrowRight",
    "StrokeWidth",
    "WarehouseWaves",
  ]) {
    assert.ok(icons[name], `missing lucide icon export: ${name}`);
  }

  // Icons already used by web components must keep resolving after the upgrade.
  for (const name of ["Compass", "Sparkles", "Briefcase", "Search"]) {
    assert.ok(icons[name], `missing lucide icon export: ${name}`);
  }
});
