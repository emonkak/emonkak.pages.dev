/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have been made:
 *  - languageId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb ffff ffff fFFF FBTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 bits)
 *  - T = StandardTokenType (2 bits)
 *  - B = Balanced bracket (1 bit)
 *  - F = FontStyle (4 bits)
 *  - f = foreground color (9 bits)
 *  - b = background color (9 bits)
 */
const EncodedTokenDataConsts = {
    LANGUAGEID_MASK: 0b00000000000000000000000011111111,
    TOKEN_TYPE_MASK: 0b00000000000000000000001100000000,
    BALANCED_BRACKETS_MASK: 0b00000000000000000000010000000000,
    FONT_STYLE_MASK: 0b00000000000000000111100000000000,
    FOREGROUND_MASK: 0b00000000111111111000000000000000,
    BACKGROUND_MASK: 0b11111111000000000000000000000000,

    LANGUAGEID_OFFSET: 0,
    TOKEN_TYPE_OFFSET: 8,
    BALANCED_BRACKETS_OFFSET: 10,
    FONT_STYLE_OFFSET: 11,
    FOREGROUND_OFFSET: 15,
    BACKGROUND_OFFSET: 24,
};

export const FontStyle = {
    NotSet: -1,
    None: 0,
    Italic: 1,
    Bold: 2,
    Underline: 4,
    Strikethrough: 8,
};

export function getLanguageId(encodedTokenAttributes) {
    return (
        (encodedTokenAttributes & EncodedTokenDataConsts.LANGUAGEID_MASK) >>>
        EncodedTokenDataConsts.LANGUAGEID_OFFSET
    );
}

export function getTokenType(encodedTokenAttributes) {
    return (
        (encodedTokenAttributes & EncodedTokenDataConsts.TOKEN_TYPE_MASK) >>>
        EncodedTokenDataConsts.TOKEN_TYPE_OFFSET
    );
}

export function containsBalancedBrackets(encodedTokenAttributes) {
    return (encodedTokenAttributes & EncodedTokenDataConsts.BALANCED_BRACKETS_MASK) !== 0;
}

export function getFontStyle(encodedTokenAttributes) {
    return (
        (encodedTokenAttributes & EncodedTokenDataConsts.FONT_STYLE_MASK) >>>
        EncodedTokenDataConsts.FONT_STYLE_OFFSET
    );
}

export function getForeground(encodedTokenAttributes) {
    return (
        (encodedTokenAttributes & EncodedTokenDataConsts.FOREGROUND_MASK) >>>
        EncodedTokenDataConsts.FOREGROUND_OFFSET
    );
}

export function getBackground(encodedTokenAttributes) {
    return (
        (encodedTokenAttributes & EncodedTokenDataConsts.BACKGROUND_MASK) >>>
        EncodedTokenDataConsts.BACKGROUND_OFFSET
    );
}
