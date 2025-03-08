import * as assert from 'assert';
import * as fs from 'fs';
import * as alf from '../alf-regex';

const filter = {
    xmlTag: 'Bar',
    jinjaMacro: 'bar'
};

suite('Transform Regex Test Suite', () => {
    test('Regex for general XML tag attributes', () => {
        const rgx = alf.getRegexForGeneralXmlTagAttributes(['j', 'jj']);
        const input = fs.readFileSync('src/test/fixtures/alf.regex.general.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/alf.regex.general.xml.tag.expected.alf', 'utf-8');

        // function signature is duplicated from Transform.ts (yuck)
        const output = input.replace(rgx, (match: string, t1: string, alt: string, expr: string, t2: string) => `@${t1}@${expr}@${t2}@`);

        // console.log(rgx.toString());
        // console.log(output);

        assert.strictEqual(output, expected);
    });

    test('Regex for general Jinja macro parameters', () => {
        const rgx = alf.getRegexForGeneralJinjaMacroParameters(['j', 'jj']);
        const input = fs.readFileSync('src/test/fixtures/alf.regex.general.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/alf.regex.general.jinja.macro.expected.alf', 'utf-8');

        // function is duplicated from Transform.ts (even more yuck)
        const output = input.replace(rgx, (match: string, g1: string, g2: string, g3: string, g4: string, g5: string, g6: string, g7: string, g8: string) => {
            const t1 = g8 ? g6 : g2;
            const expr = g8 ? g8 : g4;
            const t2 = g8 ? '' : g5;
            return `@${t1}@${expr}@${t2}@`;
        });
        
        // console.log(rgx.toString());
        // console.log(output);

        assert.strictEqual(output, expected);
    });

    test('Regex for specific XML tag attribute', () => {
        const rgx = alf.getRegexForSpecificXmlTagAttribute(['j'], filter);
        const input = fs.readFileSync('src/test/fixtures/alf.regex.specific.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/alf.regex.specific.xml.tag.expected.alf', 'utf-8');

        // function signature is duplicated from Transform.ts (yuck)
        const output = input.replace(rgx, (match: string, t1: string, alt: string, expr: string, t2: string) => `@${t1}@${expr}@${t2}@`);

        // console.log(rgx.toString());
        // console.log(output);

        assert.strictEqual(output, expected);
    });

    test('Regex for specific Jinja macro parameter', () => {
        const rgx = alf.getRegexForSpecificJinjaMacroParameter(['j'], filter);
        const input = fs.readFileSync('src/test/fixtures/alf.regex.specific.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/alf.regex.specific.jinja.macro.expected.alf', 'utf-8');

        // function signature is duplicated from Transform.ts (yuck)
        const output = input.replace(rgx, (match: string, t1: string, g2: string, expr: string, t2: string) => `@${t1}@${expr}@${t2}@`);

        // console.log(rgx.toString());
        // console.log(output);

        assert.strictEqual(output, expected);
    });
});
