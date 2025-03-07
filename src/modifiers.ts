const math = require('mathjs');
const crypto = require('crypto');
import { rules as simplificationRules } from './simplify-rules';

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
        return expr.replace(ExpressionEncoder.FUNC_REGEX, (func: string) => {
            // Use a hash so that identical strings map to the same symbol. This
            // is not perfect since different string representations could be
            // algebraically equivalent, but it should cover most use cases.
            const id = crypto.createHash('md5').update(func).digest('hex');
            const symbolName: string = `${ExpressionEncoder.SYMBOL_PREFIX}${id}`;
            this.symbolsToFuncs[symbolName] = func;
            return symbolName;
        });
    }
    
    // Restore function tokens in passed expression.
    decode(expr: string) {
        return expr.replace(
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
    }
}

type transformOperation = (transformExpr: string, currentExpr: string) => string;

class Transformer {
    rgxXar: RegExp;
    rgxXaj: RegExp;
    rgxPjm: RegExp;
    encoder: (ExpressionEncoder | null);
    operation: transformOperation;

    // normal XML attributes (i.e. `x="25"`)
    static getRegexForXmlAttributes = (attrs: string[]) => new RegExp(
        `([\\s"'](${attrs.join('|')})\\s*=\\s*["']\\s*)([^"'\\{\\}]+?)(\\s*["'])`, 'g'
    );
    // XML attributes with Jinja interpolations (i.e. `x="{{ foo + 25 }}"`)
    static getRegexForXmlAttributesWithJinjaExpressions = (attrs: string[]) => new RegExp(
        `([\\s"'](${attrs.join('|')})\\s*=\\s*["']\\{\\{\\s*)([^"'\\{\\}]+?)(\\s*\\}\\}["'])`, 'g'
    );
    // Jinja macro parameters (i.e. x=foo+25)
    static getRegexForJinjaMacroParameters = (attrs: string[]) => new RegExp(
        `(([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+)(\\)\\s*\\})|([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+))`, 'g'
    );

    constructor(
        targetAttributes: string[],
        operation: transformOperation,
        doEncodeExpressions: boolean
    ) { 
        this.rgxXar = Transformer.getRegexForXmlAttributes(targetAttributes);
        this.rgxXaj = Transformer.getRegexForXmlAttributesWithJinjaExpressions(targetAttributes);
        this.rgxPjm = Transformer.getRegexForJinjaMacroParameters(targetAttributes);
        this.operation = operation;
        this.encoder = doEncodeExpressions ? new ExpressionEncoder : null;
    }

    transform(transformExpr: string, text: string) {
        const encodedTransformExpr = this.encoder ? this.encoder.encode(transformExpr) : transformExpr;
        const transformedText = text
            .replace(this.rgxXar, (match: string, t1: string, alt: string, expr: string, t2: string) => {
                return this.replace(encodedTransformExpr, t1, expr, t2);
            })
            .replace(this.rgxXaj, (match: string, t1: string, alt: string, expr: string, t2: string) => {
                return this.replace(encodedTransformExpr, t1, expr, t2);
            })
            .replace(this.rgxPjm, (match: string, g1: string, g2: string, g3: string, g4: string, g5: string, g6: string, g7: string, g8: string) => {
                const t1 = g8 ? g6 : g2;
                const expr = g8 ? g8 : g4;
                const t2 = g8 ? '' : g5;
                return this.replace(encodedTransformExpr, t1, expr, t2);
            });
        return this.encoder ? this.encoder.decode(transformedText) : transformedText;
    }

    private replace(transformExpr: string, t1: string, expr: string, t2: string) {
        const encodedExpr = this.encoder ? this.encoder.encode(expr) : expr;
        const appliedExpr = this.operation(transformExpr, encodedExpr);
        const simplifiedExpr = math.simplify(appliedExpr, simplificationRules, {}, { exactFractions: false }).toString();
        return [t1, simplifiedExpr, t2].join('');
    }
}

export type transformModifier = (transformExpr: string, text: string) => string;

const additionOperation = (transformExpr: string, currentExpr: string) => `(${currentExpr}) + ${transformExpr}`;

const translateXTransformer = new Transformer(['cx', 'x', 'xx'], additionOperation, true);
const translateZTransformer = new Transformer(['cz', 'z', 'zz'], additionOperation, true);
const translateYTransformer = new Transformer(['y', 'yy'], additionOperation, true);

export const translateX = (transformExpr: string, text: string) => translateXTransformer.transform(transformExpr, text);
export const translateZ = (transformExpr: string, text: string) => translateZTransformer.transform(transformExpr, text);
export const translateY = (transformExpr: string, text: string) => translateYTransformer.transform(transformExpr, text);

// export const mirrorX = (text: string) => {
//     const rgxTranslateXar = Transformer.getRegexForXmlAttributes(['cx', 'x', 'xx']);
//     const rgxTranslateAxj = Transformer.getRegexForXmlAttributesWithJinjaExpressions(['cx', 'x', 'xx']);
//     const rgxTranslatePjm = Transformer.getRegexForJinjaMacroParameters(['cx', 'x', 'xx']);

//     text = transform(rgxTranslateXar, rgxTranslateAxj, rgxTranslatePjm, new ExpressionEncoder(), '-1', '*', text);
    
//     const rgxMirrorAxr = Transformer.getRegexForXmlAttributes(['angle']);
//     const rgxMirrorAxj = Transformer.getRegexForXmlAttributesWithJinjaExpressions(['angle']);
//     const rgxMirrorPjm = Transformer.getRegexForJinjaMacroParameters(['angle']);

//     text = transform(rgxMirrorAxr, rgxMirrorAxj, rgxMirrorPjm, null, '+', '[TODO] angle goes here?', text);
// };
