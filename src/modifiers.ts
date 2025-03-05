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

const FUNC_REGEX = new RegExp('[^\\s]+\\([^\\(\\)]*\\)+', 'g');
const SYMBOL_PREFIX = '__s_y_m__';
const SYMBOL_REGEX = new RegExp(`${SYMBOL_PREFIX}([0-9]+)`, 'g');

const transformReplacer = (transformExpr: string, match: string, t1: string, alt: string, expr: string, t2: string) => {
    // Temporarily replace all function tokens in expression before passing
    // to math.simplify, as mathjs will munge function names.
    let funcCount = 0;
    const symbolsToFuncs: symbolsToFuncArray = {};
    expr = expr.replace(FUNC_REGEX, (func: string) => {
        const symbolName: string = `${SYMBOL_PREFIX}${funcCount}`;
        symbolsToFuncs[symbolName] = func;
        return symbolName;
    });

    // Simplify the expression.
    expr = [
        t1,
        math.simplify(`(${expr} + ${transformExpr})`, {}, { exactFractions: false }).toString(),
        t2
    ].join('');

    // Restore function tokens in expression.
    return expr.replace(SYMBOL_REGEX, (match: string, symbolNumber: string) => symbolsToFuncs[`${SYMBOL_PREFIX}${symbolNumber}`]);
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

export const translateX = (text: string, transformExpr: string) => text
    // normal XML attributes (i.e. `x="25"`)
    .replace(/([\s"'](cx|x|xx)\s*=\s*["']\s*)([^"'\{\}]+?)(\s*["'])/g, transformReplacer.bind(null, transformExpr))
    // XML attributes with Jinja interpolations (i.e. `x="{{ foo + 25 }}"`)
    .replace(/([\s"'](cx|x|xx)\s*=\s*["']\{\{\s*)([^"'\{\}]+?)(\s*\}\}["'])/g, transformReplacer.bind(null, transformExpr))
    // Jinja macro parameters (i.e. x=foo+25)
    .replace(/([\s"',\(](cx|x|xx)\s*=\s*)([^"',\}]+)/g, (match: string, t1: string, alt: string, expr: string) => {
        // In the case where the expression is last in an argument list, the
        // above regex unavoidably includes an extraneous closing parenthesis
        // (and additional characters) at the end of the expression string, so
        // shift them into the final token.
        let t2 = '';
        console.log('===========');
        console.log('match     >'+match);
        console.log('expr_orig >'+expr);
        if (countChar(expr, ')') - countChar(expr, '(') === 1) {
            console.log('PARENS?   >MISMATCHED!');
            const tokenStart = expr.lastIndexOf(')');
            t2 = expr.substring(tokenStart, expr.length);
            expr = expr.substring(0, tokenStart);
        }
        console.log('t1        >'+t1);
        console.log('expr_updt >'+expr);
        console.log('t2        >'+t2);
        console.log('===========');

        // TODO: replace funcs with symbols as in transformReplacer

        return transformReplacer(transformExpr, match, t1, alt, expr, t2);
    });
