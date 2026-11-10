import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/common/ChartCard'
import { StatCard } from '@/components/common/StatCard'
import type { Metric } from '../types'

const COLORS = [
  '#f05e47',
  '#3b5bdb',
  '#2f9e44',
  '#f59f00',
  '#7048e8',
  '#15aabf',
  '#e64980',
  '#868e96',
]
export interface Datum {
  name: string
  value: number
}
const nonZero = (d: Datum[]) => d.filter((x) => x.value > 0)

/** KPI card for a Metric; links to the existing records route when `to` is given. */
export function MetricCard({
  m,
  icon,
  to,
  hint,
}: {
  m?: Metric
  icon: LucideIcon
  to?: string
  hint?: string
}) {
  const card = (
    <StatCard
      label={m?.label ?? ''}
      icon={icon}
      value={m?.value?.toLocaleString()}
      loading={!m}
      error={m?.failed}
      hint={hint}
    />
  )
  return to ? (
    <Link
      to={to}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-coral-ink"
      aria-label={`${m?.label ?? 'Metric'}: open records`}
    >
      {card}
    </Link>
  ) : (
    card
  )
}

export const metricData = (ms?: Metric[]): Datum[] =>
  (ms ?? []).filter((m) => m.value !== undefined).map((m) => ({ name: m.label, value: m.value! }))

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="note"
      className="mb-4 flex items-start gap-2 rounded-md border border-line bg-warm p-3 text-sm"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-coral-ink" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function DonutCard({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: Datum[]
}) {
  const d = nonZero(data)
  return (
    <ChartCard title={title} description={description} empty={d.length === 0}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={d} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%">
            {d.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function HBarCard({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: Datum[]
}) {
  const d = nonZero(data).slice(0, 10)
  return (
    <ChartCard title={title} description={description} empty={d.length === 0}>
      <ResponsiveContainer>
        <BarChart data={d} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid horizontal={false} stroke="#e3e5ee" />
          <XAxis type="number" allowDecimals={false} fontSize={12} />
          <YAxis type="category" dataKey="name" width={120} fontSize={12} tickLine={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#f05e47" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function LineCard({
  title,
  description,
  data,
}: {
  title: string
  description?: string
  data: { day: string; value: number }[]
}) {
  return (
    <ChartCard title={title} description={description} empty={data.length === 0}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke="#e3e5ee" />
          <XAxis dataKey="day" fontSize={12} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="value"
            name="Records"
            stroke="#f05e47"
            strokeWidth={2}
            dot={data.length < 20}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
