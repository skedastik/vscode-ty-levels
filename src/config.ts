import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UserError } from './error';

export type tylConfig = {
    alsoTag?: string[]
}

export const CONFIG_FILENAME = 'tylconfig.json';
import { default as defaultConfig } from './tylconfig.json';

export const loadConfig = () => {
    let config: tylConfig = JSON.parse(JSON.stringify(defaultConfig));

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        const rootPath = workspaceFolders[0].uri.fsPath;
        const configPath = path.join(rootPath, CONFIG_FILENAME);
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8');
            try {
                const userConfig = JSON.parse(data);
                config = mergeConfig(config, userConfig);
            } catch (error) {
                throw new UserError(`Failed to parse ${CONFIG_FILENAME}.`);
            }
        }
    }

    if (process.env.VSCODE_DEBUG_MODE) {
        console.log(`config::loadConfig -> config=`);
        console.log('-- config begin');
        console.log(JSON.stringify(config, null, 2));
        console.log('-- config end');
    }

    return config;
};

const mergeConfig = (config1: tylConfig, config2: tylConfig) => {
    const alsoTagSet = new Set(config1.alsoTag);
    if (config1.alsoTag) {
        config1.alsoTag.forEach(item => alsoTagSet.add(item));
    }
    if (config2.alsoTag) {
        config2.alsoTag.forEach(item => alsoTagSet.add(item));
    }
    return {
        alsoTag: Array.from(alsoTagSet)
    };
};
