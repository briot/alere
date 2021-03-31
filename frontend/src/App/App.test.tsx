import React from 'react';
import { render } from '@testing-library/react';
import App from 'App';

test('basic renders', () => {
  const { getByText } = render(<App />);
  const linkElement = getByText(/Investments/i);
  expect(linkElement).toBeInTheDocument();
});
