import * as vscode from 'vscode';

const ETAG_LENGTH = 7;

const AUTOTAG_STRING = 'autotag';
const AUTOTAG_COMMENT = `<!-- ${AUTOTAG_STRING} -->`;
const AUTOTAG_REGEX = new RegExp(`^\\s*<!--\\s+${AUTOTAG_STRING}\\s+-->`);

const generateEtag = () => {
    const chars = [];
    for (let i = 0; i < ETAG_LENGTH; i++) {
        let x = Math.floor(Math.random() * 36);
        chars.push(String.fromCharCode(x < 10 ? 48 + x : 97 + x - 10));
    }
    return chars.join('');
};

const addEtagsReplacer = (quoteChar: string, padString: string, match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
    const offset = closingDelimiter.length;

    if (!/[\s\(]etag\s*=/.test(match)) {
        return [
            match.substring(0, match.length - offset),
            precedingParams.length > 0 ? padString : '',
            'etag=',
            quoteChar,
            generateEtag(),
            quoteChar,
            match.substring(match.length - offset, match.length)
        ].join('');
    }

    return match;
};

const addEtags = (text: string) => text
    .replace(/<(Wall|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\s*(.*?)(\s*\/>)/sg, addEtagsReplacer.bind(null, '"', ' '))
    .replace(/\{\{\s*(wall|ramp)\(\s*(.*?)(\s*\)\s*\}\})/g, addEtagsReplacer.bind(null, "'", ', '));

const removeEtags = (text: string) => text
    .replace(/((\()\s*?etag\s*?=\s*?["'].*?["']\s*?,?\s*|,\s*?etag\s*?=\s*?["'][^{}]*?["'])/g, '$2')
    .replace(/(\s)etag\s*=["'][^{}]*?["'] ?/sg, '$1');

const regenerateEtagsReplacer = (match: string, g1: string, g2: string) => [g1, generateEtag(), g2].join('');

const regenerateEtags = (text: string) => text.replace(/([\s\()]etag\s*?=\s*?["'])[^{}]*?(["'])/g, regenerateEtagsReplacer);

const toggleAutoTagComment = (text: string) => AUTOTAG_REGEX.test(text) ? text.substring(text.indexOf('\n') + 1, text.length) : [AUTOTAG_COMMENT, text].join('\n');

type stringModifier = (s: string) => string;

// Modify the currently selected text or the entire document if no text is selected.
const modifySelection = (modifier: stringModifier) => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    let range: vscode.Range;
    let text: string;

    if (selection.isEmpty) {
        range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        text = document.getText();
    } else {
        range = new vscode.Range(selection.start, selection.end);
        text = document.getText(selection);
    }

    editor.edit(editBuilder => {
        editBuilder.replace(range, modifier(text));
    });
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => modifySelection(addEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.removeEtags', () => modifySelection(removeEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.regenerateEtags', () => modifySelection(regenerateEtags)));

    context.subscriptions.push(vscode.commands.registerCommand('extension.findEtag', (args) => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const document = editor.document;
        const text = document.getText();
        const etag = args['etag'];

        if (!etag) {
            return;
        }

        const index = text.indexOf(etag);

        if (index !== -1) {
            const start = document.positionAt(index);
            const end = document.positionAt(index + etag.length);
            editor.selection = new vscode.Selection(start, end);
            editor.revealRange(new vscode.Range(start, end));
        } else {
            vscode.window.showInformationMessage('Etag not found.');
        }
    }));
    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            const params = new URLSearchParams(uri.query);
            const data = Object.fromEntries(params.entries());
            vscode.commands.executeCommand("extension.findEtag", data);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.pasteWithNewEtags', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const clipboardText = await vscode.env.clipboard.readText();
        const text = regenerateEtags(clipboardText);

        editor.edit(editBuilder => {
            editBuilder.replace(editor.selection, text);
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('editor.action.clipboardPasteAction', () => {
        vscode.commands.executeCommand('extension.pasteWithNewEtags');
    }));
 
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            return;
        }

        const document = editor.document;
        const firstLine = document.lineAt(0).text;

        if (AUTOTAG_REGEX.test(firstLine)) {
            const text = document.getText();
            const textEdit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), addEtags(text));
            event.waitUntil(Promise.resolve([textEdit]));   
        }
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('extension.toggleAutoTag', () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const document = editor.document;
        const range = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
        let text = document.getText();

        text = toggleAutoTagComment(text);
        if (AUTOTAG_REGEX.test(text)) {
            text = addEtags(text);
            vscode.window.showInformationMessage('Autotag enabled.');
        } else {
            vscode.window.showInformationMessage('Autotag disabled.');
        }

        editor.edit(editBuilder => {
            editBuilder.replace(range, text);
        });
    }));
}

export function deactivate() {}
