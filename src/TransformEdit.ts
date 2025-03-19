import {
    Transform,
    Rotation90Clockwise,
    Rotation90Counterclockwise,
    applyParamToEtag
} from './Transform';
import { isNumericString } from './util';
import { tylConfig } from './config';
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

const compose = (...transforms: Transform[]) => (text: string, transformExpr: string) => transforms.reduceRight(
    (acc, transform) => transform.apply(acc, transformExpr),
    text
);

export type transformEditFunction = (text: string, transformExpr: string, ...args: string[]) => string;

export class TransformEdit {
    translateX!: transformEditFunction;
    translateZ!: transformEditFunction;
    translateY!: transformEditFunction;
    mirrorX!: transformEditFunction;
    mirrorZ!: transformEditFunction;
    mirrorY!: transformEditFunction;
    rotate90Clockwise!: transformEditFunction;
    rotate90Counterclockwise!: transformEditFunction;
    set!: transformEditFunction;
    setOnEtag!: transformEditFunction;
    simplify!: transformEditFunction;

    constructor(config?: tylConfig) {
        this.configure(config);
    }

    configure(config?: tylConfig) {
        if (!config) {
            return;
        }

        const xAdd = new Transform(xAttributes, additionOperation, config.simplifyExpressions);
        const zAdd = new Transform(zAttributes, additionOperation, config.simplifyExpressions);
        const yAdd = new Transform(yAttributes, additionOperation, config.simplifyExpressions);
        const angleMirrorZ = new Transform(angleAttributes, angleMirrorZOperation, false);
        const angleMirrorX = new Transform(angleAttributes, angleMirrorXOperation, false);
        const angleMirrorYRamps = new Transform(angleAttributes, angleMirrorYRampOperation, false, 'Ramp');
        const coordMirrorZ = new Transform(xAttributes, coordMirrorOperation, config.simplifyExpressions);
        const coordMirrorX = new Transform(zAttributes, coordMirrorOperation, config.simplifyExpressions);
        const coordMirrorY = new Transform(yAttributes, coordMirrorOperation, config.simplifyExpressions);
        const newClockwise90Rotation = (x: string, z: string) => new Rotation90Clockwise(x, z, config.simplifyExpressions);
        const newCounterclockwise90Rotation = (x: string, z: string) => new Rotation90Counterclockwise(x, z, config.simplifyExpressions);
        const newParamSetTransform = (param: string, filter?: string) => new Transform([param], setOperation, config.simplifyExpressions, filter);
        // Simplify all attributes that are affected by any transform edit, irrespective of config.simplifyExpressions.
        const simplifyExpressions = new Transform(
            xAttributes.concat(zAttributes, yAttributes, ['w', 'd']),
            (currentExpression) => currentExpression
        );

        this.translateX = (text: string, transformExpr: string) => xAdd.apply(text, transformExpr);
        this.translateZ = (text: string, transformExpr: string) => zAdd.apply(text, transformExpr);
        this.translateY = (text: string, transformExpr: string) => yAdd.apply(text, transformExpr);
        this.mirrorX = compose(coordMirrorX, angleMirrorX);
        this.mirrorZ = compose(coordMirrorZ, angleMirrorZ);
        this.mirrorY = compose(coordMirrorY, angleMirrorYRamps);
        this.rotate90Clockwise = (text: string, x: string, z: string) => newClockwise90Rotation(x, z).apply(text);
        this.rotate90Counterclockwise = (text: string, x: string, z: string) => newCounterclockwise90Rotation(x, z).apply(text);

        this.set = (text: string, valueExpr: string, param: string, filter?: string) => newParamSetTransform(param, filter).apply(text, valueExpr);
        this.setOnEtag = (text: string, valueExpr: string, param: string, etag: string) => applyParamToEtag(text, param, valueExpr, etag);

        this.simplify = (text: string) => simplifyExpressions.apply(text);
    }
}
