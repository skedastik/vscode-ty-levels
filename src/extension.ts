import * as vscode from 'vscode';
import EtagEdit from './EtagEdit';
import * as editTransform from './edit-transform';
import { ConfigAutoLoader, tylConfig } from './config';
import { UserError } from './error';
import { debounce } from './util';
import { execSync } from 'child_process';

type stringEdit = (s: string) => string;

// Edit the currently selected text or the entire document if no text is selected.
const editSelection = async (edit: stringEdit) => {
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
    await editor.edit(editBuilder => {
        editBuilder.replace(range, edit(text));
    });
};

let lastInputValue: string = '';
const TRANSLATE_PROMPT = 'Enter translation expression. Example: "-2" or "2 * myVar"';

type transformEdit = (text: string, transformExpr: string, ...args: string[]) => string;
type argSplitter = (argString: string) => string[];

type commandParams = {
    [key: string]: string
}

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
            lastInputValue = input;
            expr = input;
            if (splitter) {
                args = splitter(input);
                expr = args[0];
                args = args.slice(1);
            }
        }
        await editSelection((text) => edit(text, expr, ...args));
    }
    catch (error) {
        if (error instanceof UserError) {
            vscode.window.showErrorMessage(error.message);
            return;
        }
        if (error instanceof Error) {
            console.log(error.stack);
        }
        vscode.window.showErrorMessage('Internal error.');
        throw error;
    }
};

export function activate(context: vscode.ExtensionContext) {
    const etagEdit = new EtagEdit();

    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => editSelection((text: string ) => etagEdit.addEtags(text))));
    context.subscriptions.push(vscode.commands.registerCommand('extension.removeEtags', () => editSelection((text: string ) => etagEdit.removeEtags(text))));
    context.subscriptions.push(vscode.commands.registerCommand('extension.regenerateEtags', () => editSelection((text: string ) => etagEdit.regenerateEtags(text))));

    context.subscriptions.push(vscode.commands.registerCommand('extension.findEtag', (commandParams) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const text = document.getText();
        const etag = commandParams['etag'];
        if (!etag) {
            return;
        }
        const regex = new RegExp(`[\\s(]\\s*etag\\s*=\\s*["']${etag}["']`);
        const match = regex.exec(text);
        if (!match) {
            vscode.window.showErrorMessage(`Etag "${etag}" not found.`);
            return;
        }
        const index = text.indexOf(etag);
        const start = document.positionAt(index);
        const end = document.positionAt(index + etag.length);
        editor.selection = new vscode.Selection(start, end);
        editor.revealRange(new vscode.Range(start, end));
    }));

    context.subscriptions.push(vscode.window.registerUriHandler({
        handleUri(uri: vscode.Uri) {
            const url = new URL(uri);
            const queryParams = new URLSearchParams(uri.query);
            const commandParams = Object.fromEntries(queryParams.entries());
            const command = url.pathname.split('/').pop();
            switch (command) {
                case 'extension.findEtag':
                case 'extension.setParamOnEtag':
                    vscode.commands.executeCommand(command, commandParams);
                    break;
                default:
                    vscode.window.showInformationMessage(`Invalid command "${command}".`);
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('extension.pasteWithEtags', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const autotagEnabled = EtagEdit.isAutotagEnabled(document.getText());
        if (autotagEnabled) {
            const clipboardText = await vscode.env.clipboard.readText();
            let taggedText = etagEdit.regenerateEtags(clipboardText);
            taggedText = etagEdit.addEtags(taggedText);
            await vscode.env.clipboard.writeText(taggedText);
            await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
            await vscode.env.clipboard.writeText(clipboardText);
            return;
        }
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    }));
 
    context.subscriptions.push(vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        const document = event.document;
        const text = document.getText();
        if (EtagEdit.isAutotagEnabled(text)) {
            const textEdit = new vscode.TextEdit(new vscode.Range(0, 0, document.lineCount, 0), etagEdit.addEtags(text));
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
        text = etagEdit.toggleAutoTagComment(text);
        if (EtagEdit.isAutotagEnabled(text)) {
            text = etagEdit.addEtags(text);
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

    context.subscriptions.push(vscode.commands.registerCommand('extension.rotate90Clockwise', () => transformSelection(
        editTransform.rotate90Clockwise
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.rotate90Counterclockwise', () => transformSelection(
        editTransform.rotate90Counterclockwise
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.setParam', () => transformSelection(
        (text: string, valueExpr: string, ...args: string[]) => editTransform.set(text, valueExpr, args[0], args[1]),
        'Enter: {<param>,<value>,<element(optional)>}. Examples: "w,5" or "shape,bspGrenade,Goody"',
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

    context.subscriptions.push(vscode.commands.registerCommand('extension.setParamOnEtag', async (commandParams) => {
        const etag = commandParams.etag;
        if (!etag) {
            vscode.window.showInformationMessage('Command missing "etag" param.');
        }
        delete commandParams.etag;
        await transformSelection((text: string) => {
            for (const param in commandParams) {
                text = editTransform.setOnEtag(text, commandParams[param], param, etag);
            }
            return text;
        });
        vscode.commands.executeCommand('extension.findEtag', { etag });
    }));

    const configAutoLoader = new ConfigAutoLoader(
        context,
        // debounce to avoid reading the config file too often
        debounce(async (config: tylConfig) => {
            etagEdit.configure(config);
        }, 500)
    );
    configAutoLoader.start();
}

export function deactivate() {}
