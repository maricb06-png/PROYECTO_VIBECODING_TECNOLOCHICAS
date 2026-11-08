export function localDate(date = new Date()) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
export function getWeekKey(date = new Date()) { const local = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = local.getDay() || 7; local.setDate(local.getDate() - day + 1); return localDate(local); }
export function getCurrentWeekDates() { const start = new Date(`${getWeekKey()}T12:00:00`); return Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return localDate(date); }); }
export function weekdayLetter(value: string) { return ['D', 'L', 'M', 'X', 'J', 'V', 'S'][new Date(`${value}T12:00:00`).getDay()]; }
export function formatShortDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); }
