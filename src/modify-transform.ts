import Transform from './Transform';

const additionOperation = (currentExpr: string, transformExpr: string) => `(${currentExpr}) + ${transformExpr}`;
const multiplicationOperation = (currentExpr: string, transformExpr: string) => `(${currentExpr}) * ${transformExpr}`;
const angleMirrorZOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        return currentExpr;
    }
    angle = angle === 0 ? angle : 360 - angle;
    return angle.toString();
};
const angleMirrorXOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        return currentExpr;
    }
    angle = angle <= 180 ? 180 - angle : 540 - angle;
    return angle.toString();
};

const xAttributes = ['cx', 'x', 'xx'];
const zAttributes = ['cz', 'z', 'zz'];
const yAttributes = ['y', 'yy'];
const angleAttributes = ['angle'];

const xAdd = new Transform(xAttributes, additionOperation);
const zAdd = new Transform(zAttributes, additionOperation);
const yAdd = new Transform(yAttributes, additionOperation);
const xMultiply = new Transform(xAttributes, multiplicationOperation);
const zMultiply = new Transform(zAttributes, multiplicationOperation);
const angleMirrorZ = new Transform(angleAttributes, angleMirrorZOperation, false);
const angleMirrorX = new Transform(angleAttributes, angleMirrorXOperation, false);

export const translateX = (text: string, transformExpr: string) => xAdd.apply(text, transformExpr);
export const translateZ = (text: string, transformExpr: string) => zAdd.apply(text, transformExpr);
export const translateY = (text: string, transformExpr: string) => yAdd.apply(text, transformExpr);

export const mirrorZ = (text: string) => xMultiply.apply(angleMirrorZ.apply(text), '-1');
export const mirrorX = (text: string) => zMultiply.apply(angleMirrorX.apply(text), '-1');
