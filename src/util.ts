export const debounce = (fn: Function, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

export const isNumericString = (s: string) => /^\s*-?\s*[0-9]+(\.[0-9]+)?(e-?[0-9]+)?\s*$/.test(s);
