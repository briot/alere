import * as React from 'react';
import { RelativeDate, toDate } from 'Dates';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         Tooltip } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import Panel from 'Panel';
import Plots from 'Plots';
import Networth from 'NetWorth';
import './Dashboard.css';

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

const byCategorySettings = () => {
   return (
      <div>
      expenses

      number of columns

      number of rows

      time range
      </div>
   );
}

interface CategoryPiePanelProps {
   expenses: boolean;
   mindate: RelativeDate;
   maxdate: RelativeDate;
}
const CategoryPiePanel: React.FC<CategoryPiePanelProps> = p => {
   return (
      <Panel
         cols={2}
         header={`${p.expenses ? 'Expenses' : 'Income'} from ${toDate(p.mindate)} to ${toDate(p.maxdate)}`}
         settings={byCategorySettings}
      >
         <Plots.CategoryPie
            expenses={p.expenses}
            mindate={p.mindate}
            maxdate={p.maxdate}
         />
      </Panel>
   );
}


interface DashboardProps {
   setHeader?: (title: string|undefined) => void;
}

const Dashboard: React.FC<DashboardProps> = p => {
   const { setHeader } = p;

   React.useEffect(
      () => setHeader?.('Overview'),
      [setHeader]
   );

   return (
      <div className="dashboard">
         <Panel
            cols={2}
            rows={2}
            header="Net Worth"
         >
            <Networth
                showShares={false}
                showPrice={false}
                dates={["today", "end of prev year", "end of prev prev year"]}
            />
         </Panel>

         <CategoryPiePanel
            expenses={true}
            mindate="start of year"
            maxdate="today"
         />

         <CategoryPiePanel
            expenses={false}
            mindate="start of year"
            maxdate="today"
         />

         <Panel header="Upcoming transactions" />
         <Panel
            cols={2}
            header="Cashflow quadrant"
         >
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
         </Panel>
         <Panel header="Notes" />
      </div>
   );
}

export default Dashboard;
