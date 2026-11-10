import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { EmptyState } from '@/components/common/states'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface BarDatum {
  name: string
  value: number
}

export function BarChartCard({
  title,
  data,
  emptyDescription,
}: {
  title: string
  data?: BarDatum[]
  emptyDescription?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data?.length ? (
          <div className="h-56" role="img" aria-label={title}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid vertical={false} stroke="#e3e5ee" />
                <XAxis dataKey="name" tickLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#f05e47" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No data available" description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  )
}
