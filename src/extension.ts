import * as vscode from 'vscode';
import EtagEdit from './EtagEdit';
import { TransformEdit, transformEditFunction } from './TransformEdit';
import { ConfigAutoLoader, tylConfig } from './config';
import { UserError } from './error';
import { debounce } from './util';

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
const getTranslatePrompt = () => 'Enter translation expression. Example: "-2" or "2 * myVar"';
const getMirrorPrompt = (coord: string) => `Enter ${coord}-coordinate to reflect across.`;
const getRotatePrompt = () => 'Enter center of rotation. Example: "0,0"';

type argSplitter = (argString: string) => string[];

type commandParams = {
    [key: string]: string
}

// Transform (translate/mirror etc.) elements
const transformSelection = async (edit: transformEditFunction, prompt?: string, splitter?: argSplitter) => {
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
    const transformEdit = new TransformEdit();

    context.subscriptions.push(vscode.commands.registerCommand('extension.addEtags', () => editSelection((text: string ) => etagEdit.addEtags(text))));
    context.subscriptions.push(vscode.commands.registerCommand('extension.removeEtags', () => editSelection((text: string ) => etagEdit.removeEtags(text))));
    context.subscriptions.push(vscode.commands.registerCommand('extension.regenerateEtags', () => editSelection((text: string ) => etagEdit.regenerateEtags(text))));

    context.subscriptions.push(vscode.commands.registerCommand('extension.findEtag', async (commandParams) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const etag = commandParams['etag'];
        if (!etag) {
            return;
        }
        const regex = new RegExp(`[\\s(]\\s*etag\\s*=\\s*["']${etag}["']`);

        const openDocuments = vscode.workspace.textDocuments;
        for (const document of openDocuments) {
            const text = document.getText();
            const match = regex.exec(text);

            if (match) {
                const index = text?.indexOf(etag);
                const start = document.positionAt(index);
                const end = document.positionAt(index + etag.length);

                const openedEditor = await vscode.window.showTextDocument(document, { preview: false });

                openedEditor.selection = new vscode.Selection(start, end);
                openedEditor.revealRange(new vscode.Range(start, end));

                return;
            }
        }
    
        vscode.window.showErrorMessage(`Etag "${etag}" not found. Is the right ALF document open?`);
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
        transformEdit.translateX,
        getTranslatePrompt()
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateZ', () => transformSelection(
        transformEdit.translateZ,
        getTranslatePrompt()
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.translateY', () => transformSelection(
        transformEdit.translateY,
        getTranslatePrompt()
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorX', () => transformSelection(
        transformEdit.mirrorX,
        getMirrorPrompt('Z')
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorZ', () => transformSelection(
        transformEdit.mirrorZ,
        getMirrorPrompt('X')
    )));
    
    context.subscriptions.push(vscode.commands.registerCommand('extension.mirrorY', () => transformSelection(
        transformEdit.mirrorY,
        getMirrorPrompt('Y')
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.rotate90Clockwise', () => transformSelection(
        transformEdit.rotate90Clockwise,
        getRotatePrompt(),
        (argString) => {
            let args = argString.split(',');
            if (args.length < 2) {
                throw new UserError('Invalid input. Expected at least two comma-separated arguments.');
            }
            return args;
        }
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.rotate90Counterclockwise', () => transformSelection(
        transformEdit.rotate90Counterclockwise,
        getRotatePrompt(),
        (argString) => {
            let args = argString.split(',');
            if (args.length < 2) {
                throw new UserError('Invalid input. Expected at least two comma-separated arguments.');
            }
            return args;
        }
    )));

    context.subscriptions.push(vscode.commands.registerCommand('extension.setParam', () => transformSelection(
        (text: string, valueExpr: string, ...args: string[]) => transformEdit.set(text, valueExpr, args[0], args[1]),
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
                text = transformEdit.setOnEtag(text, commandParams[param], param, etag);
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
            transformEdit.configure(config);
        }, 500)
    );
    configAutoLoader.start();
}

export function deactivate() {}
