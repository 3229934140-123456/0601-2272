import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Dashboard } from '@/pages/Dashboard';
import { FileImport } from '@/pages/FileImport';
import { RulesSettings } from '@/pages/RulesSettings';
import { DiffCheck } from '@/pages/DiffCheck';
import { ResultReview } from '@/pages/ResultReview';
import { ExportArchive } from '@/pages/ExportArchive';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="import" element={<FileImport />} />
          <Route path="rules" element={<RulesSettings />} />
          <Route path="check" element={<DiffCheck />} />
          <Route path="review" element={<ResultReview />} />
          <Route path="export" element={<ExportArchive />} />
        </Route>
      </Routes>
    </Router>
  );
}
