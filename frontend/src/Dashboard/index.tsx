import * as React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
         Tooltip } from 'recharts';
import AutoSizer from 'react-virtualized-auto-sizer';
import Panel from 'Panel';
import IncomeExpenses, { IncomeExpensesProps } from 'Dashboard/IncomeExpenses';
import NetworthPanel, { NetworthPanelProps } from 'Dashboard/NetworthPanel';
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


interface DashboardProps {
   setHeader?: (title: string|undefined) => void;
}

const Dashboard: React.FC<DashboardProps> = p => {
   const { setHeader } = p;

   React.useEffect(
      () => setHeader?.('Overview'),
      [setHeader]
   );

   const [ panel1, setPanel1 ] = React.useState<IncomeExpensesProps>({
      rowspan: 1,
      colspan: 2,
      expenses: true,
      range: "current year",
   });
   const [ panel2, setPanel2 ] = React.useState<IncomeExpensesProps>({
      rowspan: 1,
      colspan: 2,
      expenses: false,
      range: "current year",
   });
   const [ panel3, setPanel3 ] = React.useState<NetworthPanelProps>({
      rowspan: 2,
      colspan: 2,
      showShares: false,
      showPrice: false,
      dates: ["today", "end of last month", "end of last year"],
   });

   return (
      <div className="dashboard">
         <NetworthPanel  data={panel3} setData={setPanel3} />
         <IncomeExpenses data={panel1} setData={setPanel1} />
         <IncomeExpenses data={panel2} setData={setPanel2} />
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
         <Panel header="Profit and Loss" />
      </div>
   );
}

export default Dashboard;
