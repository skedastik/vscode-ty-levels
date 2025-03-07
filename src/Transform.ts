const math = require('mathjs');
const crypto = require('crypto');
import { rules as simplificationRules } from './simplify-rules';

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

export default class Transform {
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
        this.rgxXar = Transform.getRegexForXmlAttributes(targetAttributes);
        this.rgxXaj = Transform.getRegexForXmlAttributesWithJinjaExpressions(targetAttributes);
        this.rgxPjm = Transform.getRegexForJinjaMacroParameters(targetAttributes);
        this.operation = operation;
        this.encoder = doEncodeExpressions ? new ExpressionEncoder : null;
    }

    apply(transformExpr: string, text: string) {
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
