import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import EtagEdit from '../EtagEdit';

let randomStub: sinon.SinonStub;

import * as testConfig from '../tylconfig.json';

suite('Etag Edit Test Suite', () => {
    setup(function () {
        randomStub = sinon.stub(Math, 'random');
        randomStub.returns(0);
    });
    
    teardown(function () {
        randomStub.restore();
    });
    
    test('addEtags', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.addEtags.expected.alf', 'utf-8');
        const edit = new EtagEdit(testConfig);
        assert.strictEqual(edit.addEtags(input), expected);
    });

    test('removeEtags', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.removeEtags.expected.alf', 'utf-8');
        const edit = new EtagEdit(testConfig);
        assert.strictEqual(edit.removeEtags(input), expected);
    });

    test('regenerateEtags', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.regenerateEtags.expected.alf', 'utf-8');
        const edit = new EtagEdit(testConfig);
        assert.strictEqual(edit.regenerateEtags(input), expected);
    });

    test('toggleAutoTagComment on', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.toggleAutoTagComment.on.expected.alf', 'utf-8');
        const edit = new EtagEdit(testConfig);
        assert.strictEqual(edit.toggleAutoTagComment(input), expected);
    });

    test('toggleAutoTagComment off', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.autotagged.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.toggleAutoTagComment.off.expected.alf', 'utf-8');
        const edit = new EtagEdit(testConfig);
        assert.strictEqual(edit.toggleAutoTagComment(input), expected);
    });

    test('addEtags with custom tagging config', () => {
        const input = fs.readFileSync('src/test/fixtures/etags.addEtags.with.config.alf', 'utf-8');
        const expected = fs.readFileSync('src/test/fixtures/etags.addEtags.with.config.expected.alf', 'utf-8');
        const edit = new EtagEdit({
            "alsoTag": ["Bar", "NotASolid"]
        });
        assert.strictEqual(edit.addEtags(input), expected);
    });
});
