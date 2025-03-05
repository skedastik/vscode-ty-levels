import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as mod from '../modifiers';

let randomStub: sinon.SinonStub;

suite('Modifiers Test Suite', () => {
    setup(function () {
        randomStub = sinon.stub(Math, 'random');
    });
    
    teardown(function () {
        randomStub.restore();
    });
    
    test('addEtags', () => {
        randomStub.returns(0);

        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.addEtags.expected.alf', 'utf-8');

        assert.strictEqual(mod.addEtags(input), expected);
    });

    test('removeEtags', () => {
        randomStub.returns(0);

        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.removeEtags.expected.alf', 'utf-8');

        assert.strictEqual(mod.removeEtags(input), expected);
    });

    test('regenerateEtags', () => {
        randomStub.returns(0);

        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.regenerateEtags.expected.alf', 'utf-8');

        assert.strictEqual(mod.regenerateEtags(input), expected);
    });

    test('toggleAutoTagComment on', () => {
        randomStub.returns(0);

        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.toggleAutoTagComment.on.expected.alf', 'utf-8');

        assert.strictEqual(mod.toggleAutoTagComment(input), expected);
    });

    test('toggleAutoTagComment off', () => {
        randomStub.returns(0);

        const input = fs.readFileSync('src/test/fixtures/etags.autotagged.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.toggleAutoTagComment.off.expected.alf', 'utf-8');

        assert.strictEqual(mod.toggleAutoTagComment(input), expected);
    });

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
});
