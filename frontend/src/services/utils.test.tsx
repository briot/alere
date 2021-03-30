import React from 'react';
import { render } from '@testing-library/react';
import { mod } from 'services/utils';

test('modulo', () => {
   expect(mod(10, 12)).toBe(10);
   expect(mod(12, 12)).toBe(0);
   expect(mod(13, 12)).toBe(1);
   expect(mod(-10, 12)).toBe(2);
});

