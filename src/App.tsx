import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Link } from 'react-router-dom';
import { Protected } from './auth';
import { Layout } from './components/Layout';
import { Empty, Loading } from './components/ui';
import { Login } from './pages/Login';
import { Problems } from './pages/Problems';
import { Submissions, SubmissionDetail } from './pages/Submissions';
import { Competitions, CompetitionDetail } from './pages/Competitions';
const Workspace = lazy(() => import('./pages/Workspace').then((m) => ({ default: m.Workspace })));
const AdminProblems = lazy(() => import('./pages/AdminProblems').then((m) => ({ default: m.AdminProblems })));
const AdminProblemEditor = lazy(() =>
  import('./pages/AdminProblems').then((m) => ({ default: m.AdminProblemEditor })),
);
const AdminCompetitions = lazy(() =>
  import('./pages/AdminCompetitions').then((m) => ({ default: m.AdminCompetitions })),
);
const CreateCompetition = lazy(() =>
  import('./pages/AdminCompetitions').then((m) => ({ default: m.CreateCompetition })),
);

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AppRoutes />
    </Suspense>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/problems" replace />} />
          <Route path="problems" element={<Problems />} />
          <Route path="problems/:id" element={<Workspace />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="submissions/:id" element={<SubmissionDetail />} />
          <Route path="competitions" element={<Competitions />} />
          <Route path="competitions/:id" element={<CompetitionDetail />} />
          <Route element={<Protected admin />}>
            <Route path="admin/problems" element={<AdminProblems />} />
            <Route path="admin/problems/new" element={<AdminProblemEditor />} />
            <Route path="admin/problems/:id" element={<AdminProblemEditor />} />
            <Route path="admin/competitions" element={<AdminCompetitions />} />
            <Route path="admin/competitions/new" element={<CreateCompetition />} />
          </Route>
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <Empty title="ไม่พบหน้าที่ต้องการ">
            <Link className="button primary" to="/problems">
              กลับไปคลังโจทย์
            </Link>
          </Empty>
        }
      />
    </Routes>
  );
}
