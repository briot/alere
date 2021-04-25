import React from 'react';
import { addMonth, dateToDate, monthCount } from 'Dates';

test('adding months', () => {
   const d1 = new Date('2021-03-31 00:00:00Z');
   expect(d1.getTimezoneOffset()).toBe(-120);
   addMonth(d1, -1);
   expect(d1.getTimezoneOffset()).toBe(-60);
   expect(d1).toStrictEqual(new Date('2021-02-28 01:00:00Z')); // dst

   const d2 = new Date('2021-05-31 03:00:00Z');
   addMonth(d2, -1);
   expect(d2).toStrictEqual(new Date('2021-04-30 03:00:00Z'));

   const d3 = new Date('2021-04-15 00:00:00Z');
   expect(d3.getTimezoneOffset()).toBe(-120);
   addMonth(d3, -1);
   expect(d3.getTimezoneOffset()).toBe(-60);
   expect(d3).toStrictEqual(new Date('2021-03-15 01:00:00Z')); // ??? 01:00:00

   const d4 = new Date('2021-05-31 03:00:00Z');
   addMonth(d4, 1);
   expect(d4).toStrictEqual(new Date('2021-06-30 03:00:00Z'));

   const d5 = new Date('2021-03-31 00:00:00Z');
   addMonth(d5, -12);
   expect(d5).toStrictEqual(new Date('2020-03-31 00:00:00Z'));
});

test('monthCount', () => {
   const now = new Date();
   expect(monthCount('1day')).toStrictEqual(1);
   expect(monthCount('1month')).toStrictEqual(1);
   expect(monthCount('3months')).toStrictEqual(3);
   expect(monthCount('month so far')).toStrictEqual(1);
   expect(monthCount('last month')).toStrictEqual(1);
   expect(monthCount('3years')).toStrictEqual(36);
   expect(monthCount('5years')).toStrictEqual(60);
   expect(monthCount('current year')).toStrictEqual(12);
   expect(monthCount('last year')).toStrictEqual(12);
   expect(monthCount('current year so far')).toStrictEqual(now.getMonth() + 1);
   expect(monthCount('forever')).toStrictEqual(NaN);
   expect(monthCount('future')).toStrictEqual(NaN);
});

test('datetoDate', () => {
   const now = new Date();
   const startOfYear = new Date(now.getFullYear(), 0, 1);
   expect(dateToDate('start of year')).toStrictEqual(startOfYear);

   const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
   expect(dateToDate('end of year')).toStrictEqual(endOfYear);

   const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
   expect(dateToDate('end of last year')).toStrictEqual(endOfLastYear);

   const endOf2Year = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59);
   expect(dateToDate('end of 2 years ago')).toStrictEqual(endOf2Year);

});
