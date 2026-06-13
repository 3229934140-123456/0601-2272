import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileUp,
  Settings,
  FileSearch,
  CheckCircle2,
  Archive,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: '工作台', icon: LayoutDashboard },
  { path: '/import', label: '文件导入', icon: FileUp },
  { path: '/rules', label: '规则设置', icon: Settings },
  { path: '/check', label: '差异核对', icon: FileSearch },
  { path: '/review', label: '结果复核', icon: CheckCircle2 },
  { path: '/export', label: '导出归档', icon: Archive },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">运费核对系统</h1>
            <p className="text-xs text-slate-400">物流财务对账平台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-sm font-bold">
            财
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">张会计</p>
            <p className="text-xs text-slate-400">财务专员</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
