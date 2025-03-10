const ETAG_LENGTH = 7;

const AUTOTAG_STRING = 'autotag';
const AUTOTAG_COMMENT = `<!-- ${AUTOTAG_STRING} -->`;

export default class EtagEdit {
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
        padString: string,
        match: string,
        identifier: string,
        precedingParams: string,
        closingDelimiter: string
    ) => {
        const offset = closingDelimiter.length;

        if (!/[\s\(]etag\s*=/.test(match)) {
            return [
                match.substring(0, match.length - offset),
                precedingParams.length > 0 ? padString : '',
                'etag=',
                quoteChar,
                EtagEdit.generateEtag(),
                quoteChar,
                match.substring(match.length - offset, match.length)
            ].join('');
        }

        return match;
    };

    addEtags(text: string) {
        return text
            .replace(
                // XML elements
                /<(Wall[^DS]|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\s*(.*?)(\s*\/>)/sg,
                (match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
                    return this.addEtagsReplacer('"', ' ', match, identifier, precedingParams, closingDelimiter);
                }
            )
            .replace(
                // Jinja macros
                /\{\{\s*(Wall|WallDoor|Ramp|Solid|WallSolid|FreeSolid)\(\s*(.*?)(\s*\)\s*\}\})/g,
                (match: string, identifier: string, precedingParams: string, closingDelimiter: string) => {
                    return this.addEtagsReplacer("'", ', ', match, identifier, precedingParams, closingDelimiter);
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
