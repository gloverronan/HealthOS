export const getLocalISODate = (d = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

export const isToday = (dateString) => {
    return dateString === getLocalISODate();
};

export const formatDateDisplay = (dateString) => {
    if (isToday(dateString)) return 'Today';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
