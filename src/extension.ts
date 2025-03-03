// Automatically add etags to Walls, WallDoors, and Ramps.

// [TODO] Implement `/find` TUI command in Avara editing tools by singalling
// Python listener that opens VSCode URI (i.e.: vscode://extension.id/action)?

import * as vscode from 'vscode';
import * as path from 'path';

const ETAG_LENGTH = 6;

const generateEtag = () => {
    const chars = [];
    for (let i = 0; i < ETAG_LENGTH; i++) {
        let x = Math.floor(Math.random() * 36);
        chars.push(String.fromCharCode(x < 10 ? 48 + x : 97 + x - 10));
    }
    return chars.join('');
};

const replacer = ((quoteChar: string, padString: string, match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
    const offset = closingDelimiter.length;

    if (!/[ \(]etag\s*=/.test(match)) {
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
});

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => {      
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const document = editor.document;

            const text = document.getText()
                .replace(/<(Wall|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\s*(.*?)(\s*\/>)/sg, replacer.bind(null, '"', ' '))
                .replace(/\{\{\s*(wall|ramp)\(\s*(.*?)(\s*\)\s*\}\})/sg, replacer.bind(null, "'", ', '));

            editor.edit(editBuilder => {
				editBuilder.replace(new vscode.Range(0, 0, document.lineCount, 0), text);
			});
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.findEtag', (args) => {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const document = editor.document;
            const text = document.getText();
            const etag = args['etag'];

            if (etag) {
                const index = text.indexOf(etag);

                if (index !== -1) {
                    const start = document.positionAt(index);
                    const end = document.positionAt(index + etag.length);
                    editor.selection = new vscode.Selection(start, end);
                    editor.revealRange(new vscode.Range(start, end));
                } else {
                    vscode.window.showInformationMessage('Etag not found.');
                }
            }
        }
    }));

    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            const params = new URLSearchParams(uri.query);
            const data = Object.fromEntries(params.entries());
            vscode.commands.executeCommand("extension.findEtag", data);
        }
    }));
}

export function deactivate() {}
