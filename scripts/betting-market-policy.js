"use strict";

function isUnderPlayableSelection(value) {
  const fields = typeof value === "string"
    ? [value]
    : [value?.selection, value?.selectionName, value?.label, value?.name];
  const text = fields.filter(item => item != null).join(" ");
  return /\bUNDER\b|\bmeno\s+di\b/i.test(text);
}

const normalize = value => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

function marketNameOf(value) {
  return normalize(value?.betSelection?.market?.name || value?.market?.name || value?.marketName || value?.market);
}

function matchdayOf(value) {
  const explicit = Number(value?.matchday ?? value?.context?.matchday);
  if (Number.isInteger(explicit)) return explicit;
  const matchId = String(value?.betSelection?.identity?.matchId || value?.matchId || "");
  const parsed = Number(matchId.match(/-md-(\d{2})$/)?.[1]);
  return Number.isInteger(parsed) ? parsed : null;
}

function isIndividualPlayerFoulMarket(value) {
  const name = marketNameOf(value);
  return name === "U/O FALLI COMMESSI GIOCATORE" || name === "U/O FALLI SUBITI GIOCATORE";
}

function playablePolicyFor(value, { matchday = matchdayOf(value) } = {}) {
  if (Number(matchday) >= 6 && isUnderPlayableSelection(value)) {
    return { status: "NOT_PLAYABLE", code: "UNDER_NOT_PLAYABLE", reason: "I mercati Under sono esclusi dalle proposte giocabili dalla sesta giornata." };
  }
  if (Number(matchday) >= 6 && isIndividualPlayerFoulMarket(value)) {
    return { status: "NOT_PLAYABLE", code: "INDIVIDUAL_FOUL_NOT_PLAYABLE", reason: "I falli commessi o subiti del singolo giocatore sono esclusi dalle proposte giocabili dalla sesta giornata." };
  }
  return { status: "PLAYABLE", code: null, reason: null };
}

function isPlayableSelection(value, options) {
  return playablePolicyFor(value, options).status === "PLAYABLE";
}

module.exports = { isUnderPlayableSelection, isIndividualPlayerFoulMarket, playablePolicyFor, isPlayableSelection, marketNameOf, matchdayOf };
