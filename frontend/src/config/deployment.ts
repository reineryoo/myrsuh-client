export const staticDataEnabled = import.meta.env.VITE_DATA_SOURCE === 'static'
export const appPath = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`

// Имена файлов одинаковы в браузере и Python-экспорте, включая Windows.
export const scheduleFilename = (groupId: string) => `${encodeURIComponent(groupId).replaceAll('%', '_')}.json`
