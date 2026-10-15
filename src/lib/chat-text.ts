/** Strip Arabic vocalization marks, preserving letters, emoji and name decorations. */
export function withoutArabicDiacritics(text: string): string {
  return text.replace(/[\u0610-\u061A\u064B-\u0652\u0656-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED]/g, "");
}