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
});
