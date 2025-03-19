import {
    Transform,
    Rotation90Clockwise,
    Rotation90Counterclockwise,
    applyParamToEtag
} from './Transform';
import { isNumericString } from './util';

import { UserError } from './error';

const additionOperation = (currentExpr: string, transformExpr: string) => {
    if (transformExpr === '') {
        throw new UserError('Missing argument.');
    }
    return `${currentExpr} + (${transformExpr})`;
};
const angleMirrorZOperation = (currentExpr: string) => {
    if (!isNumericString(currentExpr)) {
        throw new UserError('Angle values must be numeric.');
    }
    let angle = Number.parseFloat(currentExpr);
    angle = angle === 0 ? angle : 360 - angle;
    return angle.toString();
};
const angleMirrorXOperation = (currentExpr: string) => {
    if (!isNumericString(currentExpr)) {
        throw new UserError('Angle values must be numeric.');
    }
    let angle = Number.parseFloat(currentExpr);
    angle = angle <= 180 ? 180 - angle : 540 - angle;
    return angle.toString();
};
const angleMirrorYRampOperation = (currentExpr: string) => {
    if (!isNumericString(currentExpr)) {
        throw new UserError('Angle values must be numeric.');
    }
    let angle = Number.parseFloat(currentExpr);
    switch (angle) {
        case 0:   return '180';
        case 90:  return '270';
        case 180: return '0';
        case 270: return '90';
    }
    return currentExpr;
};
const coordMirrorOperation = (currentExpr: string, transformExpr: string) => {
    if (transformExpr === '') {
        transformExpr = '0';
    }
    if (!isNumericString(transformExpr)) {
        throw new UserError('Coordinate must be numeric.');
    }
    return `2 * (${transformExpr}) - (${currentExpr})`;
};

const setOperation = (currentExpr: string, transformExpr: string) => transformExpr;

const xAttributes = ['cx', 'x', 'xx'];
const zAttributes = ['cz', 'z', 'zz'];
const yAttributes = ['y', 'yy'];
const angleAttributes = ['angle'];

// Avoid algebraic simplification if NO_SIMPLIFY env var is set
const NO_SIMPLIFY = !!process.env.NO_SIMPLIFY;

const xAdd = new Transform(xAttributes, additionOperation, !NO_SIMPLIFY);
const zAdd = new Transform(zAttributes, additionOperation, !NO_SIMPLIFY);
const yAdd = new Transform(yAttributes, additionOperation, !NO_SIMPLIFY);
const angleMirrorZ = new Transform(angleAttributes, angleMirrorZOperation, false);
const angleMirrorX = new Transform(angleAttributes, angleMirrorXOperation, false);
const angleMirrorYRamps = new Transform(angleAttributes, angleMirrorYRampOperation, false, 'Ramp');
const coordMirrorZ = new Transform(xAttributes, coordMirrorOperation, !NO_SIMPLIFY);
const coordMirrorX = new Transform(zAttributes, coordMirrorOperation, !NO_SIMPLIFY);
const coordMirrorY = new Transform(yAttributes, coordMirrorOperation, !NO_SIMPLIFY);
const newClockwise90Rotation = (x: string, z: string) => new Rotation90Clockwise(x, z, !NO_SIMPLIFY);
const newCounterclockwise90Rotation = (x: string, z: string) => new Rotation90Counterclockwise(x, z, !NO_SIMPLIFY);
const newParamSetTransform = (param: string, filter?: string) => new Transform([param], setOperation, !NO_SIMPLIFY, filter);
// Simplify all attributes that are affected by any transform edit, irrespective of NO_SIMPLIFY env var.
const simplifyExpressions = new Transform(
    xAttributes.concat(zAttributes, yAttributes, ['w', 'd']),
    (currentExpression) => currentExpression
);

const compose = (...transforms: Transform[]) => (text: string, transformExpr: string) => transforms.reduceRight(
    (acc, transform) => transform.apply(acc, transformExpr),
    text
);

export const translateX = (text: string, transformExpr: string) => xAdd.apply(text, transformExpr);
export const translateZ = (text: string, transformExpr: string) => zAdd.apply(text, transformExpr);
export const translateY = (text: string, transformExpr: string) => yAdd.apply(text, transformExpr);
export const mirrorX = compose(coordMirrorX, angleMirrorX);
export const mirrorZ = compose(coordMirrorZ, angleMirrorZ);
export const mirrorY = compose(coordMirrorY, angleMirrorYRamps);
export const rotate90Clockwise = (text: string, x: string, z: string) => newClockwise90Rotation(x, z).apply(text);
export const rotate90Counterclockwise = (text: string, x: string, z: string) => newCounterclockwise90Rotation(x, z).apply(text);

export const set = (text: string, valueExpr: string, param: string, filter?: string) => newParamSetTransform(param, filter).apply(text, valueExpr);
export const setOnEtag = (text: string, valueExpr: string, param: string, etag: string) => applyParamToEtag(text, param, valueExpr, etag);

export const simplify = (text: string) => simplifyExpressions.apply(text);
