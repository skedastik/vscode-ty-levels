import * as assert from 'assert';
import * as fs from 'fs';
import * as edit from '../edit-transform';
import * as transform from '../Transform';

suite('Transform Edit Test Suite', () => {
    test('translateX + 1', () => {
        const expr = '1';
        const input = fs.readFileSync('src/test/fixtures/transform.translate.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.translate.x.plus1.expected.alf', 'utf-8');
        assert.strictEqual(edit.translateX(input, expr), expected);
    });

    test('translateX with expression containing multiple functions', () => {
        const expr = 'math.cos(45) + cos(45) + fn(baz)';
        const input = '<Foo x="{{ 10 }}"';
        const expected = '<Foo x="{{ math.cos(45) + cos(45) + fn(baz) + 10 }}"';
        assert.strictEqual(edit.translateX(input, expr), expected);
    });

    test('translateX with expression containing function already in attribute', () => {
        const expr = '-cos(a)';
        const input = '<Foo x="{{ cos(a) }}"';
        const expected = '<Foo x="{{ 0 }}"';
        assert.strictEqual(edit.translateX(input, expr), expected);
    });

    test('translateX + 1 with term that could result in positive exponent', () => {
        const expr = '1';
        const input = '<Foo x="{{ x * x * x * x }}"';
        const expected = '<Foo x="{{ x * x * x * x + (1) }}"';
        assert.strictEqual(edit.translateX(input, expr), expected);
    });

    test('translateX + 1 with term that could result in negative exponent', () => {
        const expr = '1';
        const input = '<Foo x="{{ (1 / x) / x }}"';
        const expected = '<Foo x="{{ (1 / x) / x + (1) }}"';
        assert.strictEqual(edit.translateX(input, expr), expected);
    });

    test('translateZ', () => {
        const expr = '1';
        const input = '{{ Foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=0, yy=0, irrelevant="0" }}';
        const expected = '{{ Foo(cx=0, x=0, xx=0, cz=1, z=1, zz=1, y=0, yy=0, irrelevant="0" }}';
        assert.strictEqual(edit.translateZ(input, expr), expected);
    });

    test('translateY', () => {
        const expr = '1';
        const input = '{{ Foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=0, yy=0, irrelevant="0" }}';
        const expected = '{{ Foo(cx=0, x=0, xx=0, cz=0, z=0, zz=0, y=1, yy=1, irrelevant="0" }}';
        assert.strictEqual(edit.translateY(input, expr), expected);
    });

    test('mirrorZ', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.mirror.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.mirror.z.expected.alf', 'utf-8');
        assert.strictEqual(edit.mirrorZ(input), expected);
    });

    test('mirrorX', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.mirror.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.mirror.x.expected.alf', 'utf-8');
        assert.strictEqual(edit.mirrorX(input), expected);
    });

    test('mirrorY', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.mirror.y.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.mirror.y.expected.alf', 'utf-8');
        assert.strictEqual(edit.mirrorY(input), expected);
    });

    test('set without a filter', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.set.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.set.general.expected.alf', 'utf-8');
        assert.strictEqual(edit.set(input, '0', 'foo'), expected);
    });

    test('set with a filter', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.set.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.set.specific.expected.alf', 'utf-8');
        assert.strictEqual(edit.set(input, '0', 'foo', 'Ramp'), expected);
    });

    test('set with attribute containing ".n"', () => {
        const input = '<Foo bar.1="baz" />';
        const expected = '<Foo bar.1="qux" />';
        assert.strictEqual(edit.set(input, 'qux', 'bar.1'), expected);
    });

    test('set with value containing "." and value containing an RGBA color', () => {
        const input = '<Foo bar="#ffffff" />';
        const expected = '<Foo bar="rgba(0, 0, 0, 0%)" />';
        assert.strictEqual(edit.set(input, 'rgba(0, 0, 0, 0%)', 'bar'), expected);
    });

    test('set with value containing a hex color', () => {
        const input = '<Foo bar="#ffffff" />';
        const expected = '<Foo bar="#000000" />';
        assert.strictEqual(edit.set(input, '#000000', 'bar'), expected);
    });

    test('rotate 90 clockwise', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.rotate90.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.rotate90.clockwise.expected.alf', 'utf-8');
        assert.strictEqual((new transform.Rotation90Clockwise()).apply(input), expected);
    });

    test('rotate 90 counterclockwise', () => {
        const input = fs.readFileSync('src/test/fixtures/transform.rotate90.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/transform.rotate90.counterclockwise.expected.alf', 'utf-8');
        assert.strictEqual((new transform.Rotation90Counterclockwise()).apply(input), expected);
    });
});
