export type regexFilter = {
    xmlTag: string,
    jinjaMacro: string
};

export const getRegexForGeneralXmlTagAttributes = (attrs: string[]) => new RegExp(
    `([\\s"'](${attrs.join('|')})\\s*=\\s*["']\\s*\\{?\\{?\\s*)([^"'\\{\\}]+?)(\\s*\\}?\\}?["'])`, 'g'
);
// Multiple Jinja macro parameters (i.e. x=foo+25) for any macro
export const getRegexForGeneralJinjaMacroParameters = (attrs: string[]) => new RegExp(
    `(([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+)(\\)\\s*\\})|([\\s"',\\(](${attrs.join('|')})\\s*=\\s*)([^"',\\{\\}]+))`, 'g'
);

// Single XML tag attribute for specific tag
export const getRegexForSpecificXmlTagAttribute = (attrs: string[], filter: regexFilter) => new RegExp(
    `(<${filter.xmlTag}\\s+.*?${attrs[0]}\\s*=\\s*["']\\s*\\{?\\{?\\s*)([^"]+?)(\\s*\\}?\\}?\\s*["']\\s*.*?\\/>)`, 'sg'
);
// Single Jinja macro param for specific Jinja macro
export const getRegexForSpecificJinjaMacroParameter = (attrs: string[], filter: regexFilter) => new RegExp(
    `({{\\s*${filter.jinjaMacro}(\\(\\s*|.+?[,\\s]|)${attrs[0]}\\s*=\\s*)([^,\\}]+)(\\)\\s*\\}\\}|,.*?\\}\\})`, 'g'
);
