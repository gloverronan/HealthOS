export const loadItem = (k, def) => {
    try {
        return JSON.parse(localStorage.getItem(k)) || def;
    } catch {
        return def;
    }
};

export const saveItem = (k, v) => {
    try {
        localStorage.setItem(k, JSON.stringify(v));
    } catch { }
};

export const loadKey = (k) => {
    try {
        return localStorage.getItem(k) || '';
    } catch {
        return '';
    }
};

export const saveKey = (k, v) => {
    try {
        localStorage.setItem(k, v);
    } catch { }
};
