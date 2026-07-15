export interface UnicodeSequenceFixture {
  type: string;
  emoji: string;
  codepoint: string;
}

export const unicodeSequenceFixtures = [
  { type: "single code point", emoji: "😀", codepoint: "1f600" },
  { type: "variation selector", emoji: "❤️", codepoint: "2764-fe0f" },
  { type: "skin-tone modifier", emoji: "👍🏽", codepoint: "1f44d-1f3fd" },
  { type: "ZWJ profession", emoji: "👨‍💻", codepoint: "1f468-200d-1f4bb" },
  { type: "ZWJ family", emoji: "👨‍👩‍👧‍👦", codepoint: "1f468-200d-1f469-200d-1f467-200d-1f466" },
  { type: "gender variant", emoji: "👩‍⚕️", codepoint: "1f469-200d-2695-fe0f" },
  { type: "regional-indicator flag", emoji: "🇲🇽", codepoint: "1f1f2-1f1fd" },
  { type: "keycap", emoji: "1️⃣", codepoint: "31-fe0f-20e3" },
  {
    type: "tag sequence",
    emoji: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
    codepoint: "1f3f4-e0067-e0062-e0073-e0063-e0074-e007f",
  },
] as const satisfies readonly UnicodeSequenceFixture[];
