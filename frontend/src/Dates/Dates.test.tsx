import React from 'react';
import { addMonth } from 'Dates';

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

