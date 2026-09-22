declare module 'kuroshiro' {
  interface KuroshiroInitOptions {
    [key: string]: any;
  }
  export default class Kuroshiro {
    constructor();
    init(analyzer: any): Promise<void>;
    convert(text: string, options?: { to?: string; mode?: string; romajiSystem?: string }): Promise<string>;
    static Util: {
      isHiragana(str: string): boolean;
      isKatakana(str: string): boolean;
      isKanji(str: string): boolean;
      isJapanese(str: string): boolean;
      hasHiragana(str: string): boolean;
      hasKatakana(str: string): boolean;
      hasKanji(str: string): boolean;
      hasJapanese(str: string): boolean;
    };
  }
}

declare module 'kuroshiro-analyzer-kuromoji' {
  export default class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
  }
}
