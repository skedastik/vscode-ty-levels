import * as vscode from 'vscode';
import * as mod from './modifiers';

// Modify the currently selected text or the entire document if no text is selected.
const modifySelection = (modifier: mod.stringModifier) => {
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
    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => modifySelection(mod.addEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.removeEtags', () => modifySelection(mod.removeEtags)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.regenerateEtags', () => modifySelection(mod.regenerateEtags)));

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
        const text = mod.regenerateEtags(clipboardText);

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

        if (mod.AUTOTAG_REGEX.test(firstLine)) {
            const text = document.getText();
            const textEdit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), mod.addEtags(text));
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

        text = mod.toggleAutoTagComment(text);
        if (mod.AUTOTAG_REGEX.test(text)) {
            text = mod.addEtags(text);
            vscode.window.showInformationMessage('Autotag enabled.');
        } else {
            vscode.window.showInformationMessage('Autotag disabled.');
        }

        editor.edit(editBuilder => {
            editBuilder.replace(range, text);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateX', async () => {
        const expr = await vscode.window.showInputBox({
            prompt: 'Enter translation expression (e.g. "-2" or "myVar" or "2 * math.cos(foo).")',
            placeHolder: '0'
        });
        if (expr === undefined) {
            return;
        }
        try {
            modifySelection(mod.translateX.bind(null, expr));
        }
        catch {
            vscode.window.showInformationMessage('Invalid expression.');
        }
    }));
}

export function deactivate() {}
