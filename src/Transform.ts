const math = require('mathjs');
const crypto = require('crypto');
import { rules as simplificationRules } from './simplify-rules';
import * as alf from './alf-regex';

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

type transformOperation = (currentExpr: string, transformExpr: string) => string;

export default class Transform {
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
            this.regexTag = alf.getRegexForSpecificXmlTagAttribute(targetAttributes, filter);
            this.regexMacro = alf.getRegexForSpecificJinjaMacroParameter(targetAttributes, filter);
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
                .replace(this.regexTag, (match: string, t1: string, alt: string, expr: string, t2: string) => {
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                })
                .replace(this.regexMacro, (match: string, t1: string, g2: string, expr: string, t2: string) => {
                    return this.replace(encodedTransformExpr, t1, expr, t2);
                });
        } else {
            transformedText = text
                .replace(this.regexTag, (match: string, t1: string, alt: string, expr: string, t2: string) => {
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
