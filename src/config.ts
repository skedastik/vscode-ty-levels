import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UserError } from './error';

export type tylConfig = {
    autotag?: string[]
}

export type autoLoadCallbackFunction = (config: tylConfig) => void;

import { default as defaultConfig } from './tylconfig.json';

export class ConfigAutoLoader {
    #context: vscode.ExtensionContext;
    #autoLoadCallback: autoLoadCallbackFunction;
    #watcher?: vscode.FileSystemWatcher;

    private static CONFIG_FILENAME = 'tylconfig.json';

    constructor(context: vscode.ExtensionContext, autoLoadCallback: autoLoadCallbackFunction) {
        this.#context = context;
        this.#autoLoadCallback = autoLoadCallback;
    }

    private static mergeConfig(config1: tylConfig, config2: tylConfig) {
        const tagSet = new Set(config1.autotag);
        if (config1.autotag) {
            config1.autotag.forEach(item => tagSet.add(item));
        }
        if (config2.autotag) {
            config2.autotag.forEach(item => tagSet.add(item));
        }
        return {
            autotag: Array.from(tagSet)
        };
    };

    private getConfigPath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(rootPath, ConfigAutoLoader.CONFIG_FILENAME);
            return configPath;
        }
    }

    private loadConfig() {
        let config: tylConfig = JSON.parse(JSON.stringify(defaultConfig));
    
        const configPath = this.getConfigPath();

        if (configPath) {
            if (fs.existsSync(configPath)) {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.loadConfig -> User config file found at ${configPath}. Merging with default config...`);
                }
                const data = fs.readFileSync(configPath, 'utf-8');
                try {
                    const userConfig = JSON.parse(data);
                    config = ConfigAutoLoader.mergeConfig(config, userConfig);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to parse ${ConfigAutoLoader.CONFIG_FILENAME}.`);
                }
            } else if (process.env.VSCODE_DEBUG_MODE) {
                console.log(`ConfigAutoLoader.loadConfig -> No user config file found at ${configPath}. Loading default config...`);
            }
        }
    
        if (process.env.VSCODE_DEBUG_MODE) {
            console.log(`ConfigAutoLoader.loadConfig -> config=`);
            console.log('-- config begin');
            console.log(JSON.stringify(config, null, 2));
            console.log('-- config end');
        }
    
        this.#autoLoadCallback(config);
    };

    private handleConfigDeletion() {
        this.loadConfig();
    }

    start() {
        if (!this.#watcher) {
            this.loadConfig();
            const configPath = this.getConfigPath();
            if (configPath) {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.start -> Watching for changes to ${configPath}...`);
                }
            } else {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.start -> The config path does not exist. Is a workspace set up?`);
                }
                // TODO: Attempt to start watching for file system changes again
                // when config path becomes available, i.e. a workspace exists?
                return;
            }
            this.#watcher = vscode.workspace.createFileSystemWatcher(configPath);
            this.#watcher.onDidChange(() => {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.start::watcher_cb -> User config file changed. Triggering reload...`);
                }
                this.loadConfig();
            });
            this.#watcher.onDidCreate(() => {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.start::watcher_cb -> User config file created. Triggering reload...`);
                }
                this.loadConfig();
            });
            this.#watcher.onDidDelete(() => {
                if (process.env.VSCODE_DEBUG_MODE) {
                    console.log(`ConfigAutoLoader.start::watcher_cb -> User config file deleted. Triggering reload...`);
                }
                this.handleConfigDeletion();
            });
            this.#context.subscriptions.push(this.#watcher);
        }
    }
}
