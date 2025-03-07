import Transform from './Transform';

const additionOperation = (transformExpr: string, currentExpr: string) => `(${currentExpr}) + ${transformExpr}`;
const multiplicationOperation = (transformExpr: string, currentExpr: string) => `(${currentExpr}) * ${transformExpr}`;

const xAttributes = ['cx', 'x', 'xx'];
const zAttributes = ['cz', 'z', 'zz'];
const yAttributes = ['y', 'yy'];

const xAdd = new Transform(xAttributes, additionOperation, true);
const zAdd = new Transform(zAttributes, additionOperation, true);
const yAdd = new Transform(yAttributes, additionOperation, true);

export const translateX = (transformExpr: string, text: string) => xAdd.apply(transformExpr, text);
export const translateZ = (transformExpr: string, text: string) => zAdd.apply(transformExpr, text);
export const translateY = (transformExpr: string, text: string) => yAdd.apply(transformExpr, text);

const xMultiply = new Transform(xAttributes, multiplicationOperation, true);

// const angleMirrorZ = new Transform(angleAttributes, (transformExpr, currentExpr));

// export const mirrorX = (text: string) => {
//     text = xMultiply.apply('-1', text);
    
//     const rgxMirrorAxr = Transformer.getRegexForXmlAttributes(['angle']);
//     const rgxMirrorAxj = Transformer.getRegexForXmlAttributesWithJinjaExpressions(['angle']);
//     const rgxMirrorPjm = Transformer.getRegexForJinjaMacroParameters(['angle']);

//     text = transform(rgxMirrorAxr, rgxMirrorAxj, rgxMirrorPjm, null, '+', '[TODO] angle goes here?', text);
// };
