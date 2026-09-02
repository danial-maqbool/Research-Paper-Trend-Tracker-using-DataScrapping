import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PapersOverTimeChartProps {
  data: { date: string; count: number }[];
}

export const PapersOverTimeChart: React.FC<PapersOverTimeChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.date.slice(5)), // MM-DD
    datasets: [
      {
        label: 'Preprints Published',
        data: data.map((d) => d.count),
        fill: true,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.12)',
        tension: 0.35,
        pointBackgroundColor: '#0284c7',
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 10, family: 'JetBrains Mono' },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 10, family: 'JetBrains Mono' },
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

interface CategoryDistributionChartProps {
  data: { id: string; name: string; count: number }[];
}

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({ data }) => {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8);
  const chartData = {
    labels: sorted.map((d) => d.id),
    datasets: [
      {
        label: 'Papers',
        data: sorted.map((d) => d.count),
        backgroundColor: [
          '#0284c7',
          '#6366f1',
          '#8b5cf6',
          '#ec4899',
          '#f97316',
          '#10b981',
          '#06b6d4',
          '#64748b',
        ],
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          title: (items: any) => {
            const index = items[0].dataIndex;
            return `${sorted[index].id} - ${sorted[index].name}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, family: 'JetBrains Mono' },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(51, 65, 85, 0.3)',
        },
        ticks: {
          color: '#64748b',
          font: { size: 10, family: 'JetBrains Mono' },
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};
