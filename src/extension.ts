import * as vscode from 'vscode';
import * as editEtag from './edit-etag';
import * as editTransform from './edit-transform';

type stringEdit = (s: string) => string;

class UserError extends Error {}

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

let lastInputValue: string = '0';
const TRANSLATE_PROMPT = 'Enter translation expression. Example: "-2" or "2 * myVar"';
const SET_PROMPT = 'Enter: {<param>,<value>,<element(optional)>}. Examples: "w,5" or "shape,bspGrenade,Goody"';

type transformEdit = (transformExpr: string, text: string, ...args: string[]) => string;
type argSplitter = (argString: string) => string[];

// Transform (translate/mirror etc.) elements
const transformSelection = async (edit: transformEdit, prompt?: string, splitter?: argSplitter) => {
    try {
        let expr = '';
        let args: string[] = [];
        if (prompt) {
            const input = await vscode.window.showInputBox({
                prompt,
                value: lastInputValue
            });
            if (!input) {
                return;
            }
            expr = input;
            if (splitter) {
                args = splitter(input);
                expr = args[0];
                args = args.slice(1);
            }
        }
        editSelection((text) => edit(text, expr, ...args));
        lastInputValue = expr;
    }
    catch (error) {
        if (error instanceof UserError) {
            vscode.window.showInformationMessage(error.message);
            return;
        }
        if (error instanceof Error) {
            console.log(error.stack);
        }
        vscode.window.showInformationMessage('Internal error.');
        throw error;
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
        const document = editor.document;
        const autotagEnabled = editEtag.isAutotagEnabled(document.getText());
        if (autotagEnabled) {
            const clipboardText = await vscode.env.clipboard.readText();
            let taggedText = editEtag.regenerateEtags(clipboardText);
            taggedText = editEtag.addEtags(taggedText);
            await vscode.env.clipboard.writeText(taggedText);
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await vscode.env.clipboard.writeText(clipboardText);
            return;
        }
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    }));
 
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const text = document.getText();
        if (editEtag.isAutotagEnabled(text)) {
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

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateX', () => transformSelection(
        editTransform.translateX,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateZ', () => transformSelection(
        editTransform.translateZ,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateY', () => transformSelection(
        editTransform.translateY,
        TRANSLATE_PROMPT
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorX', () => transformSelection(
        editTransform.mirrorX
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorZ', () => transformSelection(
        editTransform.mirrorZ
    )));
    
    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorY', () => transformSelection(
        editTransform.mirrorY
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.setParam', () => transformSelection(
        (text: string, valueExpr: string, ...args: string[]) => editTransform.set(text, valueExpr, args[0], args[1]),
        SET_PROMPT,
        (argString) => {
            let args = argString.split(',');
            if (args.length < 2) {
                throw new UserError('Invalid input. Expected at least two comma-separated arguments.');
            }
            let param = args[0];
            args[0] = args[1];
            args[1] = param;
            return args;
        }
    )));
}

export function deactivate() {}
