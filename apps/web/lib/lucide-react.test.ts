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

void test("lucide-react 1.82.0 exports braces-sigma and keeps the realigned arrow modifier icons", () => {
  // New in lucide-react 1.82.0 (feat(icons): added `braces-sigma` icon).
  assert.ok(icons.BracesSigma, "missing lucide icon export: BracesSigma");

  // The arrow modifier outliers were redrawn in 1.82.0; their export names are
  // unchanged, so components must keep resolving them without a rename.
  for (const name of [
    "ArchiveArrowDown",
    "ArchiveArrowUp",
    "CalendarArrowDown",
    "CalendarArrowUp",
    "ClipboardCopy",
    "ClipboardPaste",
    "ClockArrowDown",
    "ClockArrowLeft",
    "ClockArrowRight",
    "ClockArrowUp",
    "CloudDownload",
    "CloudUpload",
    "FileInput",
    "FileOutput",
    "FolderInput",
    "FolderOutput",
    "HardDriveDownload",
    "HardDriveUpload",
    "Sunrise",
    "Sunset",
    "WavesArrowDown",
    "WavesArrowUp",
    "WindArrowDown",
    "WindArrowUp",
  ]) {
    assert.ok(icons[name], `missing lucide icon export: ${name}`);
  }
});
