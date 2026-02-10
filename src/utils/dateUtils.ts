import { getWeekOfMonth, formatWeekLabel, getWeekStart } from './dateUtils';

export const getWeekOfMonth = (date: Date): number => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const firstDayOfWeek = firstDay.getDay();
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
};

export const formatWeekLabel = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeekOfMonth(date);
  const suffix = week === 1 ? 'st' : week === 2 ? 'nd' : week === 3 ? 'rd' : 'th';
  return `${year}-${week}${suffix} week`;
};

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};