"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

interface OverviewProps {
  data: any[]
}

export function Overview({ data }: OverviewProps) {
  // Process data for the chart
  const chartData = data.reduce((acc: any[], item: any) => {
    const date = new Date(item.orderAt || item.saleAt).toLocaleDateString()
    const existingDay = acc.find((d) => d.name === date)
    
    if (existingDay) {
      existingDay.total += item.totalOrder || item.totalSale || 0
    } else {
      acc.push({
        name: date,
        total: item.totalOrder || item.totalSale || 0,
      })
    }
    
    return acc
  }, [])

  // Sort data by date
  chartData.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}`}
          />
          <Tooltip 
            formatter={(value: any) => 
              value.toLocaleString('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })
            }
          />
          <Bar
            dataKey="total"
            fill="currentColor"
            radius={[4, 4, 0, 0]}
            className="fill-primary"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
