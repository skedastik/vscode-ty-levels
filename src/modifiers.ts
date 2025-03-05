const math = require('mathjs');
const crypto = require('crypto');

const ETAG_LENGTH = 7;

const AUTOTAG_STRING = 'autotag';
const AUTOTAG_COMMENT = `<!-- ${AUTOTAG_STRING} -->`;
export const AUTOTAG_REGEX = new RegExp(`^\\s*<!--\\s+${AUTOTAG_STRING}\\s+-->`);

export type stringModifier = (s: string) => string;

const generateEtag = () => {
    const chars = [];
    for (let i = 0; i < ETAG_LENGTH; i++) {
        let x = Math.floor(Math.random() * 36);
        chars.push(String.fromCharCode(x < 10 ? 48 + x : 97 + x - 10));
    }
    return chars.join('');
};

const addEtagsReplacer = (
    quoteChar: string,
    padString: string,
    match: string,
    identifier: string,
    precedingParams: string,
    closingDelimiter: string
) => {
    const offset = closingDelimiter.length;

    if (!/[\s\(]etag\s*=/.test(match)) {
        return [
            match.substring(0, match.length - offset),
            precedingParams.length > 0 ? padString : '',
            'etag=',
            quoteChar,
            generateEtag(),
            quoteChar,
            match.substring(match.length - offset, match.length)
        ].join('');
    }

    return match;
};

const addEtagsReplacerXML = addEtagsReplacer.bind(null, '"', ' ');
const addEtagsReplacerJinja = addEtagsReplacer.bind(null, "'", ', ');

export const addEtags = (text: string) => text
    .replace(/<(Wall[^DS]|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\s*(.*?)(\s*\/>)/sg, addEtagsReplacerXML)
    .replace(/\{\{\s*(wall|ramp)\(\s*(.*?)(\s*\)\s*\}\})/g, addEtagsReplacerJinja);

export const removeEtags = (text: string) => text
    .replace(/((\()\s*etag\s*=\s*["'].*?["']\s*,?\s*|,\s*etag\s*=\s*["'][^{}]*?["'])/g, '$2')
    .replace(/(\s)etag\s*=["'][^{}]*?["'] ?/sg, '$1');

const regenerateEtagsReplacer = (match: string, g1: string, g2: string) => [g1, generateEtag(), g2].join('');

export const regenerateEtags = (text: string) => text
    .replace(/([\s\()]etag\s*=\s*["'])[^{}]*?(["'])/g, regenerateEtagsReplacer);

export const toggleAutoTagComment = (text: string) => AUTOTAG_REGEX.test(text)
    ? text.substring(text.indexOf('\n') + 1, text.length)
    : [AUTOTAG_COMMENT, text].join('\n');

type symbolsToFuncMap = { [key: string]: string };
class ExpressionEncoder {
    symbolsToFuncs: symbolsToFuncMap;

    static FUNC_REGEX = new RegExp('[a-zA-Z_][a-zA-Z0-9_\\.]*\\(.*?\\)+', 'g');
    static SYMBOL_PREFIX = 'sym_';
    static SYMBOL_REGEX = new RegExp(`${ExpressionEncoder.SYMBOL_PREFIX}([0-9a-f]+)`, 'g');

    constructor() {
        this.symbolsToFuncs = {};
    }

    // Replace all function tokens in expression as mathjs will evaluate
    // functions (by design). There is a "clean" way to stop mathjs from doing
    // this by passing custom rules to math.simplify, but it's *very*
    // nontrivial.
    encode(expr: string) {
        const encodedExpr = expr.replace(ExpressionEncoder.FUNC_REGEX, (func: string) => {
            // Use a hash so that identical strings map to the same symbol. This
            // is not perfect since different string representations could be
            // algebraically equivalent, but it should cover most use cases.
            const id = crypto.createHash('md5').update(func).digest('hex');
            const symbolName: string = `${ExpressionEncoder.SYMBOL_PREFIX}${id}`;
            this.symbolsToFuncs[symbolName] = func;
            return symbolName;
        });
        return encodedExpr;
    }
    
    // Restore function tokens in passed expression.
    decode(expr: string) {
        const decodedExpr = expr.replace(
            ExpressionEncoder.SYMBOL_REGEX,
            (match: string, id: string) => {
                const symbol = `${ExpressionEncoder.SYMBOL_PREFIX}${id}`;
                const func = this.symbolsToFuncs[symbol];
                if (func === undefined) {
                    throw new Error(`ExpressionEncoder.decode encountered unrecognized symbol "${symbol}".`);
                }
                return func;
            }
        );
        return decodedExpr;
    }
}

const transformReplacer = (encoder: ExpressionEncoder, transformExpr: string, match: string, t1: string, alt: string, expr: string, t2: string) => {
    
    let encodedExpr = encoder.encode(expr);

    // Simplify the expression.
    const simplifiedExpr = [
        t1,
        math.simplify(`(${encodedExpr} + ${transformExpr})`, {}, { exactFractions: false }).toString(),
        t2
    ].join('');

    // Restore function tokens in simplified expression.
    return simplifiedExpr;
};

const countChar = (str: string, char: string) => {
    let count = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === char) {
            count++;
        }
    }
    return count;
};

export const translateX = (transformExpr: string, text: string) => {
    const encoder = new ExpressionEncoder();
    const encodedTransformExpr = encoder.encode(transformExpr);
    const transformedText = text
        // normal XML attributes (i.e. `x="25"`)
        .replace(/([\s"'](cx|x|xx)\s*=\s*["']\s*)([^"'\{\}]+?)(\s*["'])/g, transformReplacer.bind(null, encoder, encodedTransformExpr))
        // XML attributes with Jinja interpolations (i.e. `x="{{ foo + 25 }}"`)
        .replace(/([\s"'](cx|x|xx)\s*=\s*["']\{\{\s*)([^"'\{\}]+?)(\s*\}\}["'])/g, transformReplacer.bind(null, encoder, encodedTransformExpr))
        // Jinja macro parameters (i.e. x=foo+25)
        .replace(/([\s"',\(](cx|x|xx)\s*=\s*)([^"',\}]+)/g, (match: string, t1: string, alt: string, expr: string) => {
            // In the case where the expression is last in an argument list, the
            // above regex unavoidably includes an extraneous closing parenthesis
            // (and additional characters) at the end of the expression string, so
            // shift them into the final token.
            let t2 = '';
            if (countChar(expr, ')') - countChar(expr, '(') === 1) {
                const tokenStart = expr.lastIndexOf(')');
                t2 = expr.substring(tokenStart, expr.length);
                expr = expr.substring(0, tokenStart);
            }
            return transformReplacer(encoder, encodedTransformExpr, match, t1, alt, expr, t2);
        });
    return encoder.decode(transformedText);
};
