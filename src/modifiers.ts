import Transform from './Transform';

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

export type transformModifier = (transformExpr: string, text: string) => string;

const additionOperation = (transformExpr: string, currentExpr: string) => `(${currentExpr}) + ${transformExpr}`;
const multiplicationOperation = (transformExpr: string, currentExpr: string) => `(${currentExpr}) * ${transformExpr}`;

const xAttributeNames = ['cx', 'x', 'xx'];
const zAttributeNames = ['cz', 'z', 'zz'];
const yAttributeNames = ['y', 'yy'];

const xAdd = new Transform(xAttributeNames, additionOperation, true);
const zAdd = new Transform(zAttributeNames, additionOperation, true);
const yAdd = new Transform(yAttributeNames, additionOperation, true);

export const translateX = (transformExpr: string, text: string) => xAdd.apply(transformExpr, text);
export const translateZ = (transformExpr: string, text: string) => zAdd.apply(transformExpr, text);
export const translateY = (transformExpr: string, text: string) => yAdd.apply(transformExpr, text);

// const xMultiply = new Transform(['cx', 'x', 'xx'], additionOperation, true);

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
