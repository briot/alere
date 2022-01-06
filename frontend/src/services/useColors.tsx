/**
 * Support for color themes.
 * Such a theme is defined in CSS (depending on whether we use a light or
 * dark them), but we sometimes need to code the colors in javascript when
 * plotting for instance.
 */
import * as React from 'react';
import * as d3Scale from 'd3-scale';
import usePrefs from '@/services/usePrefs';

const useColors = (expenses: boolean, colorsInPalette: number) => {
   const { prefs } = usePrefs();
   const func = React.useMemo(
      () => {
         // This is called before the CSS is fully reloaded when changing
         // the theme, so we might not end up with the right colors.
         // ??? Perhaps we need to css custom properties from javascript.
         window.console.log('useColors, dark=', prefs.dark_mode);
         const style = getComputedStyle(
            document.getElementById('app') || document.documentElement);
         const color1 = style.getPropertyValue(
            expenses ? "--expense-gradient-1" : "--income-gradient-1");
         const color2 = style.getPropertyValue(
            expenses ? "--expense-gradient-2" : "--income-gradient-2");
         const scale = d3Scale.scaleLinear<string>()
            .domain([0, colorsInPalette - 1])
            .range([color1, color2]);
         return (index: number) => scale(index % colorsInPalette);
      },
      [expenses, colorsInPalette, prefs.dark_mode]
   );
   return func;
}
export default useColors;
