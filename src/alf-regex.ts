// Ideally we would query the actual Jinja-XML syntax tree, but regex will have
// to suffice for now.

// General XML tag attributes (i.e. `x="0"` or `x="{{ myVar + 2 }}"`)
export const getRegexForGeneralXmlTagAttributes = (attrs: string[]) => new RegExp(
    `([\\s"'](${attrs.join('|')})\\s*=\\s*["']\\s*\\{?\\{?\\s*)([^"'\\{\\}]*?[^"'\\{\\}\\s]+?[^"'\\{\\}]*?)(\\s*\\}?\\}?\\s*["'])`, 'g'
);
// General Jinja macro parameters (i.e. `x=0`)
export const getRegexForGeneralJinjaMacroParameters = (attrs: string[]) => new RegExp(
    `(([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+)(\\)\\s*\\})|([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+))`, 'g'
);

export const FILTER_ANY_ACTOR = '[a-zA-Z_][a-zA-Z0-9_]*';

// Specific XML tag attributes (i.e. `<Foo x="0" />` or  `<Foo x="{{ myVar + 2 }}" />`)
export const getRegexForSpecificXmlTagAttributes = (attrs: string[], filter: string) => new RegExp(
    `(<${filter}(\\s+[^>]*?\\s+|\\s+)(${attrs.join('|')})\\s*=\\s*["']\\s*\\{?\\{?\\s*)([^"'\\{\\}]*?[^"'\\{\\}\\s]+?[^"'\\{\\}]*?)(\\s*\\}?\\}?\\s*["']\\s*.*?\\/>)`, 'sg'
);

// Specific Jinja macro params (i.e. `Foo(x=0)` or `Foo(x=myVar+2)`)
export const getRegexForSpecificJinjaMacroParameters = (attrs: string[], filter: string) => new RegExp(
    `({{\\s*${filter}(\\s*\\(\\s*|.+?[,\\s])(${attrs.join('|')})\\s*=\\s*)([^,\\}]+)(\\)\\s*\\}\\}|,.*?\\}\\})`, 'g'
);

export const getRegexForXmlTagWithEtag = (etag: string) => new RegExp(
    `(<${FILTER_ANY_ACTOR}(\\s+[^>]*?\\s+|\\s+)etag\\s*=\\s*["']\\s*${etag}\\s*["']\\s*.*?\\/>)`, 's'
);

export const getRegexForJinjaMacroWithEtag = (etag: string) => new RegExp(
    `({{\\s*${FILTER_ANY_ACTOR}(\\s*\\(\\s*|.+?[,\\s])etag\\s*=["']\\s*${etag}\\s*["'].*?\\}\\})`
);
