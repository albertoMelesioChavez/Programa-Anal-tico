const paths = {
    home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    file: 'M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8Zm0 0v6h6M8 12h8M8 16h6',
    folder: 'M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
    calendar: 'M4 5h16v16H4ZM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2',
    book: 'M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Zm0 0v15',
    search: 'M21 21l-5-5m2-6a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    plus: 'M12 5v14M5 12h14',
    arrow: 'M4 12h16m-6-6 6 6-6 6',
    chevron: 'm9 5 7 7-7 7',
    edit: 'm16 3 5 5L8 21H3v-5ZM13 6l5 5',
    more: 'M12 5h.01M12 12h.01M12 19h.01',
    close: 'm6 6 12 12M6 18 18 6',
    check: 'm5 12 4 4L19 6',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
    clock: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    alert: 'M12 8v5m0 3h.01M12 3 2 21h20Z',
    copy: 'M9 9h12v12H9ZM15 9V3H3v12h6',
    menu: 'M4 6h16M4 12h16M4 18h16',
    grid: 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
};
export default function AppIcon({ name = 'file', size = 22, ...props }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3.5 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.file} /></svg>;
}
