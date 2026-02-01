import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { getStatsOverview, getChartData } from '../../lib/api/admin'
import { Skeleton } from '../../components/ui/Skeleton'
import { formatPrice, formatNumber } from '../../lib/utils/format'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats', 'overview'],
    queryFn: getStatsOverview,
  })

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['admin', 'stats', 'charts', 30],
    queryFn: () => getChartData(30),
  })

  const statCards = [
    {
      label: 'Пользователей',
      value: stats?.users.total,
      subLabel: `+${stats?.users.activeToday || 0} сегодня`,
      color: 'bg-blue-100 text-blue-800',
    },
    {
      label: 'Активных подписок',
      value: stats?.subscriptions.active,
      subLabel: `+${stats?.subscriptions.newWeek || 0} за неделю`,
      color: 'bg-green-100 text-green-800',
    },
    {
      label: 'Прослушиваний сегодня',
      value: stats?.plays.today,
      subLabel: `${formatNumber(stats?.plays.month || 0)} за месяц`,
      color: 'bg-purple-100 text-purple-800',
    },
    {
      label: 'Доход за месяц',
      value: formatPrice(stats?.revenue.month || 0),
      subLabel: `Всего: ${formatPrice(stats?.revenue.total || 0)}`,
      color: 'bg-yellow-100 text-yellow-800',
      isPrice: true,
    },
  ]

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        tension: 0.4,
      },
    },
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="bg-tg-bg rounded-xl p-4">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${card.color} mb-2`}>
              {card.label}
            </div>
            {statsLoading ? (
              <Skeleton height={32} className="mb-1" />
            ) : (
              <div className="text-2xl font-bold text-tg-text">
                {card.isPrice ? card.value : formatNumber(card.value as number)}
              </div>
            )}
            <div className="text-xs text-tg-hint">{card.subLabel}</div>
          </div>
        ))}
      </div>

      {/* Plays Chart */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Прослушивания за 30 дней</h3>
        <div className="h-40">
          {chartLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton width="100%" height="100%" />
            </div>
          ) : chartData ? (
            <Line
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    data: chartData.plays,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                  },
                ],
              }}
              options={chartOptions}
            />
          ) : null}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Доходы за 30 дней</h3>
        <div className="h-40">
          {chartLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton width="100%" height="100%" />
            </div>
          ) : chartData ? (
            <Line
              data={{
                labels: chartData.labels,
                datasets: [
                  {
                    data: chartData.revenue.map((v) => v / 100),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                  },
                ],
              }}
              options={chartOptions}
            />
          ) : null}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-tg-bg rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-tg-text">
            {statsLoading ? <Skeleton height={32} /> : formatNumber(stats?.tracks.total || 0)}
          </div>
          <div className="text-xs text-tg-hint">Треков</div>
        </div>
        <div className="bg-tg-bg rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-tg-text">
            {statsLoading ? <Skeleton height={32} /> : formatNumber(stats?.tracks.purchases || 0)}
          </div>
          <div className="text-xs text-tg-hint">Покупок</div>
        </div>
        <div className="bg-tg-bg rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-tg-text">
            {statsLoading ? <Skeleton height={32} /> : formatNumber(stats?.users.activeWeek || 0)}
          </div>
          <div className="text-xs text-tg-hint">Активных за неделю</div>
        </div>
      </div>
    </div>
  )
}
