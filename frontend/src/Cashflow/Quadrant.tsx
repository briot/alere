import * as React from 'react';
import { BaseProps, DashboardModule } from 'Dashboard/Module';
import { SetHeaderProps } from 'Dashboard/Panel';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         Tooltip } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';

const radar_data = [
  { subject: '% epargne', percent: 100 , fullMark: 100, },
  { subject: 'epargne precaution', percent: 100, fullMark: 100, },
  { subject: 'imposition reelle', percent: 100, fullMark: 100, },
  { subject: 'richesse reelle', percent: 100, fullMark: 100, },
  { subject: 'ROI', percent: 1.9 / 4 * 100, fullMark: 100, },
  { subject: 'habitation', percent: 100, fullMark: 100, },
  { subject: 'independence financiere', percent: 31.5, fullMark: 100, },
  { subject: 'revenu passif', percent: 34.2, fullMark: 100, },
  { subject: 'cashflow', percent: 90, fullMark: 100, },
];

interface QuadrantProps {
}

const Quadrant: React.FC<QuadrantProps & SetHeaderProps> = p => {
   const { setHeader } = p;
   React.useEffect(
      () => setHeader?.('Cashflow quadrant'),
      [setHeader],
   );

   return (
      <AutoSizer>
         {
            ({width, height}) => (
               <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius={Math.min(width, height) / 4}
                  width={width}
                  height={height}
                  data={radar_data}
                >
                   <PolarGrid />
                   <PolarAngleAxis dataKey="subject" />
                   <PolarRadiusAxis domain={[0, 100]} />
                   <Tooltip />
                   <Radar
                      name="Cashflow quadrant"
                      dataKey="percent"
                      isAnimationActive={false}
                      stroke="var(--color-500)"
                      fill="var(--color-300)"
                      fillOpacity={0.6}
                   />
               </RadarChart>
            )
         }
      </AutoSizer>
   );
}

export interface QuadrantPanelProps extends QuadrantProps, BaseProps {
   type: "quadrant";
}

const QuadrantModule: DashboardModule<QuadrantPanelProps> = {
   Settings: undefined,
   Content: Quadrant,
}
export default QuadrantModule;