import { addMonth, dateToDate, monthCount } from '@/Dates';

test('adding months', () => {
   const d1 = new Date('2021-03-31 00:00:00Z');
   expect(d1.getTimezoneOffset()).toBe(-120);
   const d11 = addMonth(-1, d1);
   expect(d11).toStrictEqual(new Date('2021-02-28 01:00:00Z')); // dst
   expect(d11.getTimezoneOffset()).toBe(-60);

   const d2 = new Date('2021-05-31 03:00:00Z');
   const d22 = addMonth(-1, d2);
   expect(d22).toStrictEqual(new Date('2021-04-30 03:00:00Z'));

   const d3 = new Date('2021-04-15 00:00:00Z');
   expect(d3.getTimezoneOffset()).toBe(-120);
   const d33 = addMonth(-1, d3);
   expect(d33.getTimezoneOffset()).toBe(-60);
   expect(d33).toStrictEqual(new Date('2021-03-15 01:00:00Z')); // ??? 01:00:00

   const d4 = new Date('2021-05-31 03:00:00Z');
   const d44 = addMonth(1, d4);
   expect(d44).toStrictEqual(new Date('2021-06-30 03:00:00Z'));

   const d5 = new Date('2021-03-31 00:00:00Z');
   const d55 = addMonth(-12, d5);
   expect(d55).toStrictEqual(new Date('2020-03-31 00:00:00Z'));
});

test('monthCount', () => {
   const now = new Date();
   expect(monthCount('1 day')).toBeNaN();
   expect(
      monthCount('1 month', new Date(2022, 12, 31))
      ).toStrictEqual(1);
   expect(
      monthCount('1 month', new Date(2023, 1, 2))
      ).toStrictEqual(1);

   expect(monthCount('1 month')).toStrictEqual(1);
   expect(monthCount('3 months')).toStrictEqual(3);
   expect(monthCount('month so far')).toStrictEqual(1);
   expect(monthCount('last month')).toStrictEqual(1);
   expect(monthCount('3 years')).toStrictEqual(36);
   expect(monthCount('5 years')).toStrictEqual(60);
   expect(monthCount('current year')).toStrictEqual(12);
   expect(monthCount('last year')).toStrictEqual(12);

   // ??? On Feb 01, we get "1" instead of "2" (but that seems reasonable since
   // we did not have a full month yet)
   expect(monthCount('current year so far')).toStrictEqual(now.getMonth() + 1);
   expect(monthCount('all')).toStrictEqual(NaN);
   expect(monthCount('upcoming')).toStrictEqual(NaN);
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
