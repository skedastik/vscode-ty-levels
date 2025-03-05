const math = require('mathjs');

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

type symbolsToFuncArray = { [key: string]: string };
class EncodedExpression {
    encodedExpr: string;
    symbolsToFuncs: symbolsToFuncArray;

    static funcId: number;

    static FUNC_REGEX = new RegExp('[^\\s]+\\([^\\(\\)]*\\)+', 'g');
    static SYMBOL_PREFIX = '__s_y_m__';
    static SYMBOL_REGEX = new RegExp(`${EncodedExpression.SYMBOL_PREFIX}([0-9]+)`, 'g');

    constructor(expr: string) {
        EncodedExpression.funcId = 0;
        this.symbolsToFuncs = {};
        this.encodedExpr = expr.replace(EncodedExpression.FUNC_REGEX, (func: string) => {
            const symbolName: string = `${EncodedExpression.SYMBOL_PREFIX}${EncodedExpression.funcId++}`;
            this.symbolsToFuncs[symbolName] = func;
            return symbolName;
        });
    }

    get() {
        return this.encodedExpr;
    }
    
    decode(expr: string) {
        // Restore function tokens in passed expression.
        return expr.replace(
            EncodedExpression.SYMBOL_REGEX,
            (match: string, symbolNumber: string) => {
                const symbol = `${EncodedExpression.SYMBOL_PREFIX}${symbolNumber}`;
                const func = this.symbolsToFuncs[symbol];
                if (func === undefined) {
                    // symbol was encoded by a different EncodedExpression, so leave it as is
                    return symbol;
                }
                return func;
            }
        );
    }
}

const transformReplacer = (transformExpr: string, match: string, t1: string, alt: string, expr: string, t2: string) => {
    // Temporarily replace all function tokens in expression before passing to
    // math.simplify, as mathjs will munge function names (by design). There is
    // a "clean" way of doing this by passing custom rules to math.simplify, but
    // it's *very* nontrivial.
    let encodedExpr = new EncodedExpression(expr);

    // Simplify the expression.
    const simplifiedExpr = [
        t1,
        math.simplify(`(${encodedExpr.get()} + ${transformExpr})`, {}, { exactFractions: false }).toString(),
        t2
    ].join('');

    // Restore function tokens in simplified expression.
    return encodedExpr.decode(simplifiedExpr);
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
    const encodedTransformExpr = new EncodedExpression(transformExpr);
    const transformedText = text
        // normal XML attributes (i.e. `x="25"`)
        .replace(/([\s"'](cx|x|xx)\s*=\s*["']\s*)([^"'\{\}]+?)(\s*["'])/g, transformReplacer.bind(null, encodedTransformExpr.get()))
        // XML attributes with Jinja interpolations (i.e. `x="{{ foo + 25 }}"`)
        .replace(/([\s"'](cx|x|xx)\s*=\s*["']\{\{\s*)([^"'\{\}]+?)(\s*\}\}["'])/g, transformReplacer.bind(null, encodedTransformExpr.get()))
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
            return transformReplacer(encodedTransformExpr.get(), match, t1, alt, expr, t2);
        });
    return encodedTransformExpr.decode(transformedText);
};
