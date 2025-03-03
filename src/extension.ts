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

    const disposable = vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {        
        const document = event.document;
        const fileExtension = path.extname(document.fileName);

        if (fileExtension !== '.alf') {
            return;
        }

        const text = document.getText()
            .replace(/<(Wall|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\s*(.*?)(\s*\/>)/sg, replacer.bind(null, '"', ' '))
            .replace(/\{\{\s*(wall|ramp)\(\s*(.*?)(\s*\)\s*\}\})/sg, replacer.bind(null, "'", ', '));
        
        // console.log(text);

        const textEdit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), text);

        event.waitUntil(Promise.resolve([textEdit]));
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
