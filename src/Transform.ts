const math = require('mathjs');
const crypto = require('crypto');
import { rules as simplificationRules } from './simplify-rules';
import * as alf from './alf-regex';

type symbolToTokenMap = { [key: string]: string };

class ExpressionEncoder {
    symbolsToTokens: symbolToTokenMap;

    static CONFLICTING_TOKEN_REGEX = new RegExp('[a-zA-Z_][a-zA-Z0-9_\\.]*\\(.*?\\)+|#[a-fA-F0-9]{6}', 'g');
    static SYMBOL_PREFIX = 'tyl_sym_';
    static SYMBOL_REGEX = new RegExp(`${ExpressionEncoder.SYMBOL_PREFIX}([0-9a-f]+)`, 'g');

    constructor() {
        this.symbolsToTokens = {};
    }

    // Encode certain tokens that conflict with mathjs' parser. This includes
    // function tokens (which are evaluated by design in mathjs), and hex color
    // values like "#ffffff".
    encode(expr: string) {
        return expr.replace(ExpressionEncoder.CONFLICTING_TOKEN_REGEX, (token: string) => {
            // Use a hash so that identical strings map to the same symbol. This
            // is not perfect since different string representations could be
            // algebraically equivalent, but it should cover most use cases.
            const id = crypto.createHash('md5').update(token).digest('hex');
            const symbolName: string = `${ExpressionEncoder.SYMBOL_PREFIX}${id}`;
            this.symbolsToTokens[symbolName] = token;
            return symbolName;
        });
    }
    
    // Decode encoded tokens in passed expression.
    decode(expr: string) {
        return expr.replace(
            ExpressionEncoder.SYMBOL_REGEX,
            (match: string, id: string) => {
                const symbol = `${ExpressionEncoder.SYMBOL_PREFIX}${id}`;
                const token = this.symbolsToTokens[symbol];
                if (token === undefined) {
                    throw new Error(`ExpressionEncoder.decode encountered unrecognized symbol "${symbol}".`);
                }
                return token;
            }
        );
    }
}

type transformOperation = (currentExpr: string, transformExpr: string) => string;

export class Transform {
    regexTag: RegExp;
    regexMacro: RegExp;
    encoder?: ExpressionEncoder;
    operation: transformOperation;
    simplifyExpressions: boolean;
    filter?: string;

    constructor(
        targetAttributes: string[],
        operation: transformOperation,
        simplifyExpressions: boolean = true,
        filter?: string
    ) {
        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.constructor -> targetAttributes=[${targetAttributes.join('|')}] simplifyExpressions=${simplifyExpressions} filter=${filter}`);
        }

        if (filter) {
            if (targetAttributes.length > 1) {
                throw new Error('Currently the Transform class only supports one target attribute if a filter is present.');
            }
            this.regexTag = alf.getRegexForSpecificXmlTagAttributes(targetAttributes, filter);
            this.regexMacro = alf.getRegexForSpecificJinjaMacroParameters(targetAttributes, filter);
        } else {
            this.regexTag = alf.getRegexForGeneralXmlTagAttributes(targetAttributes);
            this.regexMacro = alf.getRegexForGeneralJinjaMacroParameters(targetAttributes);
        }

        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.constructor -> regexTag=${this.regexTag.toString()}`);
            console.log(`Transform.constructor -> regexMacro=${this.regexMacro.toString()}`);
        }
        
        this.operation = operation;
        this.simplifyExpressions = simplifyExpressions;
        this.filter = filter;

        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`--`);
        }
    }

    apply(text: string, transformExpr: string = '') {
        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.apply -> text=`);
            console.log('-- text begin');
            console.log(text);
            console.log('-- text end');
            console.log(`Transform.apply -> transformExpr="${transformExpr}"`);
        }

        if (this.simplifyExpressions) {
            // ExpressionEncoders should not be reused across different input expressions, so instantiate a new one
            this.encoder = new ExpressionEncoder();
        }
        const encodedTransformExpr = this.encoder ? this.encoder.encode(transformExpr) : transformExpr;
        let transformedText;

        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.apply -> encodedTransformExpr="${encodedTransformExpr}"`);
        }
        
        if (this.filter) {
            transformedText = text
                .replace(this.regexTag, (match: string, t1: string, alt: string, attr: string, expr: string, t2: string) => {
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                })
                .replace(this.regexMacro, (match: string, t1: string, g2: string, attr: string, expr: string, t2: string) => {
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                });
        } else {
            transformedText = text
                .replace(this.regexTag, (match: string, t1: string, attr: string, expr: string, t2: string) => {
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                })
                .replace(this.regexMacro, (match: string, g1: string, g2: string, g3: string, g4: string, g5: string, g6: string, g7: string, g8: string) => {
                    const t1 = g8 ? g6 : g2;
                    const expr = g8 ? g8 : g4;
                    const t2 = g8 ? '' : g5;
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                });
        }

        const decodedText = this.encoder ? this.encoder.decode(transformedText) : transformedText;

        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.apply -> decodedText=`);
            console.log('-- decodedText begin');
            console.log(decodedText);
            console.log('-- decodedText end');
        }

        return decodedText;
    }

    private replace(transformExpr: string, t1: string, expr: string, t2: string) {
        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.replace -> transformExpr="${transformExpr}"`);
            console.log(`Transform.replace -> t1="${t1}"`);
            console.log(`Transform.replace -> expr="${expr}"`);
            console.log(`Transform.replace -> t2="${t2}"`);
        }
        const encodedExpr = this.encoder ? this.encoder.encode(expr) : expr;
        const appliedExpr = this.operation(encodedExpr, transformExpr);
        const simplifiedExpr = this.simplifyExpressions ? math.simplify(appliedExpr, simplificationRules, {}, { exactFractions: false }).toString() : appliedExpr;
        const replacementString = [t1, simplifiedExpr, t2].join('');

        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`Transform.replace -> replacementString="${replacementString}"`);
            console.log(`--`);
        }

        return replacementString;
    }
}

const PLACED_ACTOR_ATTRIBUTES = ['cx', 'x', 'xx', 'cz', 'z', 'zz', 'w', 'd', 'angle'];

interface placedActorAttributes {
    [key: string]: string | undefined;
};

interface placedActorAttributesNumeric {
    x: number;
    z: number;
    w: number;
    d: number;
    angle: number | undefined;
};

class Rotation90 {
    #regexSpecificTag: RegExp;
    #regexSpecificMacro: RegExp;

    constructor() {
        this.#regexSpecificTag = alf.getRegexForSpecificXmlTagAttributes(PLACED_ACTOR_ATTRIBUTES, alf.FILTER_ANY_ACTOR);
        this.#regexSpecificMacro = alf.getRegexForSpecificJinjaMacroParameters(PLACED_ACTOR_ATTRIBUTES, alf.FILTER_ANY_ACTOR);
    }

    apply(text: string) {
        return text
            .replace(this.#regexSpecificTag, (match: string) => this.replaceTag(match))
            .replace(this.#regexSpecificMacro, (match: string) => this.replaceMacro(match));
    }

    private rotatePlacedActorAttributes(attributes: placedActorAttributes) {
        const stdAttributes: placedActorAttributesNumeric = {
            x: 0,
            z: 0,
            w: 0,
            d: 0,
            angle: undefined
        };

        // 1. convert to center-dimensions definition (x,z,w,d)

        if (attributes.x && attributes.xx) {
            const x = +attributes.x;
            const xx = +attributes.xx;
            stdAttributes.x = (x + xx) / 2;
            stdAttributes.w = Math.abs(x - xx);
        } else if (attributes.x && attributes.w) {
            stdAttributes.x = +attributes.x;
            stdAttributes.w = +attributes.w;
        } else if (attributes.cx) {
            stdAttributes.x = +attributes.cx;
        }
        
        if (attributes.z && attributes.zz) {
            const z = +attributes.z;
            const zz = +attributes.zz;
            stdAttributes.z = (z + zz) / 2;
            stdAttributes.d = Math.abs(z - zz);
        } else if (attributes.z && attributes.d) {
            stdAttributes.z = +attributes.z;
            stdAttributes.d = +attributes.d;
        } else if (attributes.cz) {
            stdAttributes.z = +attributes.cz;
        }

        if (attributes.angle) {
            stdAttributes.angle = +attributes.angle;
        }

        // 2. apply rotation

        this.applyRotation(stdAttributes);

        // 3. convert back to original definition

        if (attributes.xx) {
            attributes.x = (stdAttributes.x - stdAttributes.w / 2).toString();
            attributes.xx = (stdAttributes.x + stdAttributes.w / 2).toString();
        } else if (attributes.w) {
            attributes.x = stdAttributes.x.toString();
            attributes.w = stdAttributes.w.toString();
        } else if (attributes.cx) {
            attributes.cx = stdAttributes.x.toString();
        }
        
        if (attributes.zz) {
            attributes.z = (stdAttributes.z - stdAttributes.d / 2).toString();
            attributes.zz = (stdAttributes.z + stdAttributes.d / 2).toString();
        } else if (attributes.d) {
            attributes.z = stdAttributes.z.toString();
            attributes.d = stdAttributes.d.toString();
        } else if (attributes.cz) {
            attributes.cz = stdAttributes.z.toString();
        }

        if (attributes.angle && stdAttributes.angle !== undefined) {
            attributes.angle = stdAttributes.angle.toString();
        }
    }

    protected applyRotation(attributes: placedActorAttributesNumeric) {
        throw new Error('Rotation90ClockwiseDegrees.applyRotation -> Unimplemented.');
    }

    // The below replacement implementations are very inefficient, but they
    // reuse our existing regular expressions, so screw it.

    private replaceTag(tag: string) {
        const attributes: placedActorAttributes = {};
        const rgx = alf.getRegexForGeneralXmlTagAttributes(PLACED_ACTOR_ATTRIBUTES);

        let result;
        while ((result = rgx.exec(tag)) !== null) {
            attributes[result[2]] = result[3];
        }

        this.rotatePlacedActorAttributes(attributes);

        for (const attr in attributes) {
            tag = tag.replace(alf.getRegexForGeneralXmlTagAttributes([attr]), (match: string, t1: string, attr: string, expr: string, t2: string) => {
                return [t1, attributes[attr], t2].join('');
            });
        }

        return tag;
    }

    private replaceMacro(macro: string) {
        const attributes: placedActorAttributes = {};
        const rgx = alf.getRegexForGeneralJinjaMacroParameters(PLACED_ACTOR_ATTRIBUTES);

        let result;
        while ((result = rgx.exec(macro)) !== null) {
            const attr = result[8] ? result[7] : result[3];
            const value = result[8] ? result[8] : result[4];
            attributes[attr] = value;
        }

        this.rotatePlacedActorAttributes(attributes);

        for (const attr in attributes) {
            macro = macro.replace(
                alf.getRegexForGeneralJinjaMacroParameters([attr]),
                (match: string, g1: string, g2: string, g3: string, g4: string, g5: string, g6: string, g7: string, g8: string) => {
                    const t1 = g8 ? g6 : g2;
                    const t2 = g8 ? '' : g5;
                    return [t1, attributes[attr], t2].join('');
                }
            );
        }

        return macro;
    }
}

export class Rotation90Clockwise extends Rotation90 {
    protected applyRotation(attributes: placedActorAttributesNumeric) {
        const x = attributes.x;
        const w = attributes.w;
        attributes.x = -attributes.z;
        attributes.z = x;
        attributes.w = attributes.d;
        attributes.d = w;
        if (attributes.angle !== undefined) {
            attributes.angle = (attributes.angle + 90) % 360;
        }
    }
}

export class Rotation90Counterclockwise extends Rotation90 {
    protected applyRotation(attributes: placedActorAttributesNumeric) {
        const x = attributes.x;
        const w = attributes.w;
        attributes.x = attributes.z;
        attributes.z = -x;
        attributes.w = attributes.d;
        attributes.d = w;
        if (attributes.angle !== undefined) {
            attributes.angle = (attributes.angle + 270) % 360;
        }
    }
}
