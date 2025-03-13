const ETAG_LENGTH = 7;

const AUTOTAG_STRING = 'autotag';
const AUTOTAG_COMMENT = `<!-- ${AUTOTAG_STRING} -->`;

import { tylConfig } from './config';

export default class EtagEdit {
    #autotagIdentifiers: Set<string>;

    constructor(config?: tylConfig) {
        this.#autotagIdentifiers = new Set();
        this.configure(config);
    }

    configure(config?: tylConfig) {
        if (!config) {
            return;
        }
        this.#autotagIdentifiers.clear();
        for (let i = 0; config.autotag && i < config.autotag.length; i++) {
            this.#autotagIdentifiers.add(config.autotag[i]);
        }
    }

    private static AUTOTAG_REGEX = new RegExp(`^\\s*<!--\\s+${AUTOTAG_STRING}\\s+-->`);

    static isAutotagEnabled(documentText: string) {
        return EtagEdit.AUTOTAG_REGEX.test(documentText);
    }

    private static generateEtag = () => {
        const chars = [];
        for (let i = 0; i < ETAG_LENGTH; i++) {
            let x = Math.floor(Math.random() * 36);
            chars.push(String.fromCharCode(x < 10 ? 48 + x : 97 + x - 10));
        }
        return chars.join('');
    };

    private addEtagsReplacer = (
        quoteChar: string,
        prePad: string,
        postPad: string,
        match: string,
        identifier: string,
        precedingParams: string,
        closingDelimiter: string
    ) => {
        const offset = closingDelimiter.length;

        if (!this.#autotagIdentifiers.has(identifier)) {
            return match;
        }

        if (!/[\s\(]etag\s*=/.test(match)) {
            return [
                match.substring(0, match.length - offset),
                precedingParams.length > 0 ? prePad : '',
                'etag=',
                quoteChar,
                EtagEdit.generateEtag(),
                quoteChar,
                postPad,
                closingDelimiter
            ].join('');
        }

        return match;
    };

    addEtags(text: string) {
        return text
            .replace(
                // XML elements
                /<([a-zA-Z_][a-zA-Z0-9_\.]*)\s+(.*?)(\s*\/>)/sg,
                (match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
                    const postPad = closingDelimiter === '/>' ? ' ' : '';
                    return this.addEtagsReplacer('"', ' ', postPad, match, identifier, precedingParams, closingDelimiter);
                }
            )
            .replace(
                // Jinja macros
                /\{\{\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\(\s*(.*?)(\s*\)\s*\}\})/g,
                (match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
                    return this.addEtagsReplacer("'", ', ', '', match, identifier, precedingParams, closingDelimiter);
                }
            );
    }

    removeEtags(text: string) {
        return text
            .replace(/((\()\s*etag\s*=\s*["'].*?["']\s*,?\s*|,\s*etag\s*=\s*["'][^{}]*?["'])/g, '$2')
            .replace(/(\s)etag\s*=["'][^{}]*?["'] ?/sg, '$1');
    }

    regenerateEtags(text: string) {
        return text.replace(
            /([\s\()]etag\s*=\s*["'])[^{}]*?(["'])/g,
            (match: string, g1: string, g2: string) => {
                return [g1, EtagEdit.generateEtag(), g2].join('');
            }
        );
    }

    toggleAutoTagComment(text: string) {
        return EtagEdit.AUTOTAG_REGEX.test(text)
            ? text.substring(text.indexOf('\n') + 1, text.length)
            : [AUTOTAG_COMMENT, text].join('\n');
    }
}
