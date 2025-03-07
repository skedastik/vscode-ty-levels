import * as assert from 'assert';
import * as fs from 'fs';
import * as mod from '../modify-transform';

suite('Modifiers Test Suite', () => {
    test('translateX + 1', () => {
        const expr = '1';
        const input = fs.readFileSync('src/test/fixtures/transformations.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transformations.translateX.plus1.expected.alf', 'utf-8');
        assert.strictEqual(mod.translateX(expr, input), expected);
    });

    test('translateX with expression containing multiple functions', () => {
        const expr = 'math.cos(45) + cos(45) + fn(baz)';
        const input = '<Foo x="{{ 10 }}"';
        const expected = '<Foo x="{{ math.cos(45) + cos(45) + fn(baz) + 10 }}"';
        assert.strictEqual(mod.translateX(expr, input), expected);
    });

    test('translateX with expression containing function already in attribute', () => {
        const expr = '-cos(a)';
        const input = '<Foo x="{{ cos(a) }}"';
        const expected = '<Foo x="{{ 0 }}"';
        assert.strictEqual(mod.translateX(expr, input), expected);
    });

    test('translateX + 1 with squared term', () => {
        const expr = '1';
        const input = '<Foo x="{{ x * x }}"';
        const expected = '<Foo x="{{ x * x + 1 }}"';
        assert.strictEqual(mod.translateX(expr, input), expected);
    });

    test('translateZ', () => {
        const expr = '1';
        const input = '{{ foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=0, yy=0, irrelevant="0" }}';
        const expected = '{{ foo(cx=0, x=0, xx=0, cz=1, z=1, zz=1, y=0, yy=0, irrelevant="0" }}';
        assert.strictEqual(mod.translateZ(expr, input), expected);
    });

    test('translateY', () => {
        const expr = '1';
        const input = '{{ foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=0, yy=0, irrelevant="0" }}';
        const expected = '{{ foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=1, yy=1, irrelevant="0" }}';
        assert.strictEqual(mod.translateY(expr, input), expected);
    });
});
