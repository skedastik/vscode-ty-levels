import Transform from './Transform';

const additionOperation = (currentExpr: string, transformExpr: (string | null)) => `(${currentExpr}) + ${transformExpr}`;
const multiplicationOperation = (currentExpr: string, transformExpr: (string | null)) => `(${currentExpr}) * ${transformExpr}`;
const angleMirrorOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        return currentExpr;
    }
    angle -= 2 * angle;
    angle = angle <= 0 ? -angle : 360 - angle;
    return angle.toString();
};

const xAttributes = ['cx', 'x', 'xx'];
const zAttributes = ['cz', 'z', 'zz'];
const yAttributes = ['y', 'yy'];
const angleAttributes = ['angle'];

const xAdd = new Transform(xAttributes, additionOperation, true);
const zAdd = new Transform(zAttributes, additionOperation, true);
const yAdd = new Transform(yAttributes, additionOperation, true);
const xMultiply = new Transform(xAttributes, multiplicationOperation, true);
const angleMirrorZ = new Transform(angleAttributes, angleMirrorOperation);

export const translateX = (text: string, transformExpr: string) => xAdd.apply(text, transformExpr);
export const translateZ = (text: string, transformExpr: string) => zAdd.apply(text, transformExpr);
export const translateY = (text: string, transformExpr: string) => yAdd.apply(text, transformExpr);

export const mirrorZ = (text: string) => xMultiply.apply('-1', angleMirrorZ.apply(text));
