import * as vscode from 'vscode';
import * as editEtag from './edit-etag';
import * as editTransform from './edit-transform';

type stringEdit = (s: string) => string;

// Edit the currently selected text or the entire document if no text is selected.
const editSelection = (edit: stringEdit) => {
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
        editBuilder.replace(range, edit(text));
    });
};

let lastTransformExpr: string = '0';
const TRANSLATE_PROMPT = 'Enter translation expression (e.g. \'-2\')';

type transformEdit = (transformExpr: string, text: string) => string;

// Transform (translate/mirror etc.) elements
const transformSelection = async (edit: transformEdit, prompt: string | null = null) => {
    let expr = '';
    if (prompt) {
        const input = await vscode.window.showInputBox({
            prompt,
            value: lastTransformExpr
        });
        if (!input) {
            return;
        }
        expr = input;
    }
    try {
        editSelection((text) => edit(text, expr));
        lastTransformExpr = expr;
    }
    catch {
        vscode.window.showInformationMessage('Invalid expression.');
    }
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => editSelection(editEtag.addEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.removeEtags', () => editSelection(editEtag.removeEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.regenerateEtags', () => editSelection(editEtag.regenerateEtags)));

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
        const taggedText = editEtag.regenerateEtags(clipboardText);
        vscode.env.clipboard.writeText(taggedText);
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    }));
 
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const firstLine = document.lineAt(0).text;
        if (editEtag.AUTOTAG_REGEX.test(firstLine)) {
            const text = document.getText();
            const textEdit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), editEtag.addEtags(text));
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
        text = editEtag.toggleAutoTagComment(text);
        if (editEtag.AUTOTAG_REGEX.test(text)) {
            text = editEtag.addEtags(text);
            vscode.window.showInformationMessage('Autotag enabled.');
        } else {
            vscode.window.showInformationMessage('Autotag disabled.');
        }
        editor.edit(editBuilder => {
            editBuilder.replace(range, text);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateX', async () => transformSelection(
        editTransform.translateX,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateZ', async () => transformSelection(
        editTransform.translateZ,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateY', async () => transformSelection(
        editTransform.translateY,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorX', async () => transformSelection(
        editTransform.mirrorX
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorZ', async () => transformSelection(
        editTransform.mirrorZ
    )));
    
    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorY', async () => transformSelection(
        editTransform.mirrorY
    )));
}

export function deactivate() {}
