"use strict";

function isUnderPlayableSelection(value) {
  const fields = typeof value === "string"
    ? [value]
    : [value?.selection, value?.selectionName, value?.label, value?.name];
  const text = fields.filter(item => item != null).join(" ");
  return /\bUNDER\b|\bmeno\s+di\b/i.test(text);
}

module.exports = { isUnderPlayableSelection };
