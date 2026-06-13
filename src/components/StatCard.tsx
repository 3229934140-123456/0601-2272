import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  className?: string;
}

const colorMap = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
  green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
  amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
  red: 'from-red-500 to-red-600 shadow-red-500/20',
  purple: 'from-purple-500 to-purple-600 shadow-purple-500/20',
};

export const StatCard = ({ title, value, icon: Icon, trend, trendUp, color = 'blue', className }: StatCardProps) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-2 font-medium',
                trendUp ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg',
            colorMap[color]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
