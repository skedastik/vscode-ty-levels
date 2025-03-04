/*
 * These rules are a modified version of mathjs's default rules. Exponentiation
 * has been removed since it produces operators that are meaningless to Jinja
 * and Avara.
 * 
 * The original rules are from:
 * 
 *     https://github.com/josdejong/mathjs/blob/develop/src/function/algebra/simplify.js#L220
 */

const math = require('mathjs');

const rules = [
    // simplifyCore,
    // { l: 'n+0', r: 'n' },     // simplifyCore
    // { l: 'n^0', r: '1' },     // simplifyCore
    // { l: '0*n', r: '0' },     // simplifyCore
    // { l: 'n/n', r: '1'},      // simplifyCore
    // { l: 'n^1', r: 'n' },     // simplifyCore
    // { l: '+n1', r:'n1' },     // simplifyCore
    // { l: 'n--n1', r:'n+n1' }, // simplifyCore
    // { l: 'log(e)', r: '1' },

    // temporary rules
    // Note initially we tend constants to the right because like-term
    // collection prefers the left, and we would rather collect nonconstants
    {
        s: 'n-n1 -> n+-n1', // temporarily replace 'subtract' so we can further flatten the 'add' operator
        assuming: { subtract: { total: true } }
    },
    {
        s: 'n-n -> 0', // partial alternative when we can't always subtract
        assuming: { subtract: { total: false } }
    },
    {
        s: '-(cl*v) -> v * (-cl)', // make non-constant terms positive
        assuming: { multiply: { commutative: true }, subtract: { total: true } }
    },
    {
        s: '-(cl*v) -> (-cl) * v', // non-commutative version, part 1
        assuming: { multiply: { commutative: false }, subtract: { total: true } }
    },
    {
        s: '-(v*cl) -> v * (-cl)', // non-commutative version, part 2
        assuming: { multiply: { commutative: false }, subtract: { total: true } }
    },
    { l: '-(n1/n2)', r: '-n1/n2' },
    { l: '-v', r: 'v * (-1)' }, // finish making non-constant terms positive
    { l: '(n1 + n2)*(-1)', r: 'n1*(-1) + n2*(-1)', repeat: true }, // expand negations to achieve as much sign cancellation as possible
    // { l: 'n/n1^n2', r: 'n*n1^-n2' }, // temporarily replace 'divide' so we can further flatten the 'multiply' operator
    // { l: 'n/n1', r: 'n*n1^-1' },
    // {
    //   s: '(n1*n2)^n3 -> n1^n3 * n2^n3',
    //   assuming: { multiply: { commutative: true } }
    // },
    // {
    //   s: '(n1*n2)^(-1) -> n2^(-1) * n1^(-1)',
    //   assuming: { multiply: { commutative: false } }
    // },

    // expand nested exponentiation
    // {
    //   s: '(n ^ n1) ^ n2 -> n ^ (n1 * n2)',
    //   assuming: { divide: { total: true } } // 1/(1/n) = n needs 1/n to exist
    // },

    // collect like factors; into a sum, only do this for nonconstants
    // { l: ' vd   * ( vd   * n1 + n2)', r: 'vd^2       * n1 +  vd   * n2' },
    // {
    //   s: ' vd   * (vd^n4 * n1 + n2)   ->  vd^(1+n4)  * n1 +  vd   * n2',
    //   assuming: { divide: { total: true } } // v*1/v = v^(1+-1) needs 1/v
    // },
    // {
    //   s: 'vd^n3 * ( vd   * n1 + n2)   ->  vd^(n3+1)  * n1 + vd^n3 * n2',
    //   assuming: { divide: { total: true } }
    // },
    // {
    //   s: 'vd^n3 * (vd^n4 * n1 + n2)   ->  vd^(n3+n4) * n1 + vd^n3 * n2',
    //   assuming: { divide: { total: true } }
    // },
    // { l: 'n*n', r: 'n^2' },
    // {
    //   s: 'n * n^n1 -> n^(n1+1)',
    //   assuming: { divide: { total: true } } // n*1/n = n^(-1+1) needs 1/n
    // },
    // {
    //   s: 'n^n1 * n^n2 -> n^(n1+n2)',
    //   assuming: { divide: { total: true } } // ditto for n^2*1/n^2
    // },

    // Unfortunately, to deal with more complicated cancellations, it
    // becomes necessary to simplify constants twice per pass. It's not
    // terribly expensive compared to matching rules, so this should not
    // pose a performance problem.
    math.simplifyConstant, // First: before collecting like terms

    // collect like terms
    {
        s: 'n+n -> 2*n',
        assuming: { add: { total: true } } // 2 = 1 + 1 needs to exist
    },
    { l: 'n+-n', r: '0' },
    { l: 'vd*n + vd', r: 'vd*(n+1)' }, // NOTE: leftmost position is special:
    { l: 'n3*n1 + n3*n2', r: 'n3*(n1+n2)' }, // All sub-monomials tried there.
    // { l: 'n3^(-n4)*n1 +   n3  * n2', r: 'n3^(-n4)*(n1 + n3^(n4+1) *n2)' },
    // { l: 'n3^(-n4)*n1 + n3^n5 * n2', r: 'n3^(-n4)*(n1 + n3^(n4+n5)*n2)' },
    // noncommutative additional cases (term collection & factoring)
    {
        s: 'n*vd + vd -> (n+1)*vd',
        assuming: { multiply: { commutative: false } }
    },
    {
        s: 'vd + n*vd -> (1+n)*vd',
        assuming: { multiply: { commutative: false } }
    },
    {
        s: 'n1*n3 + n2*n3 -> (n1+n2)*n3',
        assuming: { multiply: { commutative: false } }
    },
    // {
    //   s: 'n^n1 * n -> n^(n1+1)',
    //   assuming: { divide: { total: true }, multiply: { commutative: false } }
    // },
    // {
    //   s: 'n1*n3^(-n4) + n2 * n3    -> (n1 + n2*n3^(n4 +  1))*n3^(-n4)',
    //   assuming: { multiply: { commutative: false } }
    // },
    // {
    //   s: 'n1*n3^(-n4) + n2 * n3^n5 -> (n1 + n2*n3^(n4 + n5))*n3^(-n4)',
    //   assuming: { multiply: { commutative: false } }
    // },
    { l: 'n*cd + cd', r: '(n+1)*cd' },
    {
        s: 'cd*n + cd -> cd*(n+1)',
        assuming: { multiply: { commutative: false } }
    },
    {
        s: 'cd + cd*n -> cd*(1+n)',
        assuming: { multiply: { commutative: false } }
    },
    math.simplifyConstant, // Second: before returning expressions to "standard form"

    // make factors positive (and undo 'make non-constant terms positive')
    {
        s: '(-n)*n1 -> -(n*n1)',
        assuming: { subtract: { total: true } }
    },
    {
        s: 'n1*(-n) -> -(n1*n)', // in case * non-commutative
        assuming: { subtract: { total: true }, multiply: { commutative: false } }
    },

    // final ordering of constants
    {
        s: 'ce+ve -> ve+ce',
        assuming: { add: { commutative: true } },
        imposeContext: { add: { commutative: false } }
    },
    {
        s: 'vd*cd -> cd*vd',
        assuming: { multiply: { commutative: true } },
        imposeContext: { multiply: { commutative: false } }
    },

    // undo temporary rules
    // { l: '(-1) * n', r: '-n' }, // #811 added test which proved this is redundant
    { l: 'n+-n1', r: 'n-n1' }, // undo replace 'subtract'
    { l: 'n+-(n1)', r: 'n-(n1)' },
    // {
    //   s: 'n*(n1^-1) -> n/n1', // undo replace 'divide'; for * commutative
    //   assuming: { multiply: { commutative: true } } // o.w. / not conventional
    // },
    // {
    //   s: 'n*n1^-n2 -> n/n1^n2',
    //   assuming: { multiply: { commutative: true } } // o.w. / not conventional
    // },
    // {
    //   s: 'n^-1 -> 1/n',
    //   assuming: { multiply: { commutative: true } } // o.w. / not conventional
    // },
    // { l: 'n^1', r: 'n' }, // can be produced by power cancellation
    {
        s: 'n*(n1/n2) -> (n*n1)/n2', // '*' before '/'
        assuming: { multiply: { associative: true } }
    },
    {
        s: 'n-(n1+n2) -> n-n1-n2', // '-' before '+'
        assuming: { addition: { associative: true, commutative: true } }
    },
    // { l: '(n1/n2)/n3', r: 'n1/(n2*n3)' },
    // { l: '(n*n1)/(n*n2)', r: 'n1/n2' },

    // simplifyConstant can leave an extra factor of 1, which can always
    // be eliminated, since the identity always commutes
    { l: '1*n', r: 'n', imposeContext: { multiply: { commutative: true } } },

    {
        s: 'n1/(n2/n3) -> (n1*n3)/n2',
        assuming: { multiply: { associative: true } }
    },

    { l: 'n1/(-n2)', r: '-n1/n2' },

    // ADDITIONS (vscode-ty-levels)

    { l: '0*n', r: '0' }
];

export default rules;
