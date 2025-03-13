import {
    Transform,
    Rotation90Clockwise,
    Rotation90Counterclockwise,
    applyParamToEtag
} from './Transform';

import { UserError } from './error';

const additionOperation = (currentExpr: string, transformExpr: string) => `${currentExpr} + (${transformExpr})`;
const multiplicationOperation = (currentExpr: string, transformExpr: string) => `(${currentExpr}) * (${transformExpr})`;
const angleMirrorZOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        throw new UserError('Angle values must be numeric.');
    }
    angle = angle === 0 ? angle : 360 - angle;
    return angle.toString();
};
const angleMirrorXOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        throw new UserError('Angle values must be numeric.');
    }
    angle = angle <= 180 ? 180 - angle : 540 - angle;
    return angle.toString();
};
const angleMirrorYRampOperation = (currentExpr: string) => {
    let angle = Number.parseFloat(currentExpr);
    if (Number.isNaN(angle)) {
        throw new UserError('Angle values must be numeric.');
    }
    switch (angle) {
        case 0:   return '180';
        case 90:  return '270';
        case 180: return '0';
        case 270: return '90';
    }
    return currentExpr;
};

const setOperation = (currentExpr: string, transformExpr: string) => transformExpr;

const xAttributes = ['cx', 'x', 'xx'];
const zAttributes = ['cz', 'z', 'zz'];
const yAttributes = ['y', 'yy'];
const angleAttributes = ['angle'];

const xAdd = new Transform(xAttributes, additionOperation);
const zAdd = new Transform(zAttributes, additionOperation);
const yAdd = new Transform(yAttributes, additionOperation);
const xMultiply = new Transform(xAttributes, multiplicationOperation);
const zMultiply = new Transform(zAttributes, multiplicationOperation);
const yMultiply = new Transform(yAttributes, multiplicationOperation);
const angleMirrorZ = new Transform(angleAttributes, angleMirrorZOperation, false);
const angleMirrorX = new Transform(angleAttributes, angleMirrorXOperation, false);
const angleMirrorYRamps = new Transform(angleAttributes, angleMirrorYRampOperation, false, 'Ramp');
const clockwise90Rotation = new Rotation90Clockwise();
const counterclockwise90Rotation = new Rotation90Counterclockwise();
const newParamSetTransform = (param: string, filter?: string) => new Transform([param], setOperation, true, filter);

export const translateX = (text: string, transformExpr: string) => xAdd.apply(text, transformExpr);
export const translateZ = (text: string, transformExpr: string) => zAdd.apply(text, transformExpr);
export const translateY = (text: string, transformExpr: string) => yAdd.apply(text, transformExpr);
export const mirrorZ = (text: string) => xMultiply.apply(angleMirrorZ.apply(text), '-1');
export const mirrorX = (text: string) => zMultiply.apply(angleMirrorX.apply(text), '-1');
export const mirrorY = (text: string) => yMultiply.apply(angleMirrorYRamps.apply(text), '-1');
export const rotate90Clockwise = (text: string) => clockwise90Rotation.apply(text);
export const rotate90Counterclockwise = (text: string) => counterclockwise90Rotation.apply(text);

export const set = (text: string, valueExpr: string, param: string, filter?: string) => newParamSetTransform(param, filter).apply(text, valueExpr);
export const setOnEtag = (text: string, valueExpr: string, param: string, etag: string) => applyParamToEtag(text, param, valueExpr, etag);
