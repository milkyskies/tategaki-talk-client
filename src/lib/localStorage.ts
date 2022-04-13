export const getUserId = (): string => {
    let id = localStorage.getItem('tategaki-talk-userId');
    if (id) {
        return id;
    }
    id = Math.random().toString(32).substring(2);
    localStorage.setItem('tategaki-talk-userId', id);
    return id;
}

export const getUsername = (): string => {
    let username = localStorage.getItem('tategaki-talk-username');
    if (username) {
        return username;
    }
    return "";
}

export const setUsername = (username): void => {
    localStorage.setItem('tategaki-talk-username', username);
} 