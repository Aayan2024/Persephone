// ── Symbol Matching Engine ─────────────────────────────────────────────────
// Handles all JFLAP-compatible transition label formats:
//
//  Single char:     "a", "0", "."   → matches that exact character
//  Epsilon:         "ε", "λ", ""    → epsilon (no input consumed)
//  Literal string:  "BL", "SC"      → matches that exact string token
//  Bracket range:   "[0-9]"         → matches any single char 0–9
//  Bare range:      "0-9", "a-z"    → shorthand, same as [0-9]
//  Wildcard:        "~"             → matches any single character

export const EPSILON = 'ε';
export const LAMBDA  = 'λ';

export function isEpsilon(sym: string): boolean {
  return sym === EPSILON || sym === LAMBDA || sym === '';
}

// Expand a transition symbol into the set of concrete single characters it matches.
// Returns null if the symbol is a multi-char literal (matched whole, not expanded).
function expandRange(sym: string): string[] | null {
  // Bracket range: [X-Y]
  const bracket = sym.match(/^\[(.)\-(.)\]$/);
  if (bracket) {
    const from = bracket[1].charCodeAt(0);
    const to   = bracket[2].charCodeAt(0);
    const chars: string[] = [];
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      chars.push(String.fromCharCode(i));
    }
    return chars;
  }

  // Bare range: X-Y  (exactly 3 chars, middle is '-', not a literal like "a-z" used as word)
  const bare = sym.match(/^(.)\-(.)$/);
  if (bare) {
    const from = bare[1].charCodeAt(0);
    const to   = bare[2].charCodeAt(0);
    const chars: string[] = [];
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      chars.push(String.fromCharCode(i));
    }
    return chars;
  }

  return null; // not a range
}

// Does transition symbol `sym` match input token `token`?
// `token` is always a string (either a single char or a multi-char token).
export function symbolMatches(sym: string, token: string): boolean {
  if (isEpsilon(sym)) return false; // epsilon never consumes input

  // Wildcard
  if (sym === '~') return token.length === 1;

  // Range expansion — only applies when token is a single character
  const expanded = expandRange(sym);
  if (expanded !== null) {
    return token.length === 1 && expanded.includes(token);
  }

  // Literal match (single char, multi-char string, etc.)
  return sym === token;
}

// Expand a symbol to its display string (for UI)
export function symbolDisplay(sym: string): string {
  if (isEpsilon(sym)) return 'ε';
  const expanded = expandRange(sym);
  if (expanded) return sym; // keep [0-9] or 0-9 as-is visually
  return sym;
}

// ── Greedy Tokenizer ──────────────────────────────────────────────────────
// Scans input left-to-right matching the longest transition symbol at each pos.
// Range symbols are expanded so e.g. "0-9" can match "3" in the input.
// Multi-char literals like "BL" match greedily before single chars.

export function greedyTokenize(input: string, automaton: { transitions: Array<{ symbols: string[] }> }): string[] {
  if (input.trim() === '') return [];

  // Collect all unique symbols from all transitions
  const rawSymbols = new Set<string>();
  automaton.transitions.forEach(t =>
    t.symbols.forEach(s => { if (!isEpsilon(s)) rawSymbols.add(s); })
  );

  // Build matcher list: each entry is { sym, chars|null, length }
  // For ranges, we treat them as length-1 matchers (match one char)
  // For literals, length = sym.length
  interface Matcher { sym: string; expanded: string[] | null; }
  const matchers: Matcher[] = [...rawSymbols].map(sym => ({
    sym,
    expanded: expandRange(sym),
  }));

  // Sort: longer literal symbols first, ranges after (they match 1 char)
  matchers.sort((a, b) => {
    const aLen = a.expanded ? 1 : a.sym.length;
    const bLen = b.expanded ? 1 : b.sym.length;
    return bLen - aLen; // longest first
  });

  const tokens: string[] = [];
  let pos = 0;

  while (pos < input.length) {
    let matched = false;

    for (const m of matchers) {
      if (m.expanded) {
        // Range: match exactly 1 character
        const ch = input[pos];
        if (m.expanded.includes(ch)) {
          tokens.push(ch);  // push the actual character, not the range symbol
          pos += 1;
          matched = true;
          break;
        }
      } else {
        // Literal: match the whole string
        if (input.startsWith(m.sym, pos)) {
          tokens.push(m.sym);
          pos += m.sym.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // No symbol matched — push remaining as one unknown token so simulation
      // can report a meaningful "no transition on X" error
      tokens.push(input[pos]);
      pos += 1;
    }
  }

  return tokens;
}

// ── Symbol validity check (for transition input UI) ───────────────────────
export function isValidSymbol(sym: string): boolean {
  if (!sym || sym.trim() === '') return false;
  if (isEpsilon(sym)) return true;
  if (sym === '~') return true;
  if (/^\[(.)\-(.)\]$/.test(sym)) return true;
  if (/^(.)\-(.)$/.test(sym)) return true;
  return true; // any other string is a valid literal
}
