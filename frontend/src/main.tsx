import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import Login from "./components/login-form";
import ForgotPassword from "./components/ForgotPassword";

import NotFound from './components/NotFoundPage';
import AppLayout from './components/Sidebar';
import LoaderGate from './components/LoadingAnimation';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from './components/ui/toast';
import { ConfirmProvider } from './components/ui/confirm-dialog';
import ErrorBoundary from './components/ErrorBoundary';
import RequireRole from './components/auth/RequireRole';

// Lazy load heavy components
const LandingPage = lazy(() => import('./components/landingPage/LandingPage'));
const HRMSDashboard = lazy(() => import('./components/dashboard'));
const GetProfile = lazy(() => import('./components/ProfileDisplay'));
const EmployeeDirectory = lazy(() => import('./components/hr/employeeDirectory/EmployeeDirectory'));
const AddEmployee = lazy(() => import('./components/hr/employeeDirectory/AddEmployee'));
const HolidayManagementPage = lazy(() => import('./components/hr/HolidaysPage'));
const AnnouncementsPage = lazy(() => import('./components/hr/AnnouncementsPage'));
const TaskReportsManage = lazy(() => import('./components/hr/TaskReportsPage'));
const TaskReportGenerator = lazy(() => import('./components/hr/TaskReportGenerator'));
const MyAttendance = lazy(() => import('./components/employee/MyAttendance'));
const MyTaskReports = lazy(() => import('./components/employee/MyTaskReports'));
const MySalarySlips = lazy(() => import('./components/employee/MySalarySlips'));
const SalarySlipManagement = lazy(() => import('./components/hr/salary/SalarySlipManagement'));
const SalaryStructureManagement = lazy(() => import('./components/hr/salary/SalaryStructureManagement'));
const SalaryHub = lazy(() => import('./components/hr/salary/SalaryHub'));
const MyRequests = lazy(() => import('./components/employee/MyRequests'));
const DocumentsPage = lazy(() => import('./components/employee/DocumentsPage'));
const AdminRequestsPage = lazy(() => import('./components/hr/AdminRequestsPage'));
const PoliciesPage = lazy(() => import('./components/hr/PoliciesPage'));
const SettingsPage = lazy(() => import('./components/hr/SettingsPage'));
const AppearancePage = lazy(() => import('./components/employee/AppearancePage'));
const ChatBot = lazy(() => import('./components/chatbot/chatbot'));
const MyExpenses = lazy(() => import('./components/employee/MyExpenses'));
const ExpenseManagement = lazy(() => import('./components/hr/ExpenseManagement'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));

// Routes only admin/HR may reach. Employees hitting these URLs directly are
// redirected to /dashboard instead of rendering a shell that 403s on every call.
const HR_ONLY = ['admin', 'hr'] as const;

// Shown for route-to-route navigations into a chunk that isn't cached yet.
// On the *initial* load LoaderGate's overlay sits on top of this, so the two
// never read as two sequential loaders — see LoadingAnimation.tsx.
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
            <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
            {/* Skeleton loading for better UX */}
            <div className="hidden sm:block space-y-2 w-64">
                <div className="h-2 bg-muted rounded animate-pulse"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-1/2"></div>
            </div>
        </div>
    </div>
);

// 🚀 PHASE 2 OPTIMIZATION: Component-specific loading states for better UX


// Enhanced loading states for different component types




createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <ErrorBoundary>
            <LoaderGate>
                <Toaster>
                    <QueryClientProvider client={queryClient}>
                        <ThemeProvider>
                            <ConfirmProvider>
                            <BrowserRouter>
                                <Suspense fallback={<PageLoader />}>
                                    <Routes>
                                        {/* Landing Page */}
                                        <Route path="/" element={<LandingPage />} />

                                        {/* Authentication Routes */}
                                        <Route path="/login" element={<Login />} />
                                        <Route path="/auth/login" element={<Login />} />
                                        <Route path="/auth/forgotPassword" element={<ForgotPassword />} />

                                        {/* HRMS Application Routes.
                                            One pathless layout route holds the single <AppLayout />
                                            for every authenticated page. Previously each path declared
                                            its own layout element, so navigating between them
                                            unmounted and remounted the sidebar — resetting its open
                                            state and flashing useAuth's "Authenticating..." screen on
                                            every navigation. Sharing one element keeps it mounted and
                                            swaps only the <Outlet />.

                                            RequireRole now wraps the individual leaf elements rather
                                            than the layout, since the layout is shared by all roles. */}
                                        <Route element={<AppLayout />}>
                                            <Route path="/dashboard" element={<HRMSDashboard />} />

                                            <Route path="/employees">
                                                <Route index element={<RequireRole roles={HR_ONLY}><EmployeeDirectory /></RequireRole>} />
                                                <Route path=":employeeId" element={<RequireRole roles={HR_ONLY}><EmployeeDirectory /></RequireRole>} />
                                                <Route path="add" element={<RequireRole roles={HR_ONLY}><AddEmployee /></RequireRole>} />
                                            </Route>

                                            <Route path="/holidays" element={<HolidayManagementPage />} />
                                            <Route path="/announcements" element={<AnnouncementsPage />} />
                                            <Route path="/policies" element={<PoliciesPage />} />
                                            <Route path="/settings" element={<RequireRole roles={HR_ONLY}><SettingsPage /></RequireRole>} />
                                            <Route path="/appearance" element={<AppearancePage />} />
                                            <Route path="/attendance/my" element={<MyAttendance />} />

                                            {/* Mixed access: the index/generate views are HR-only,
                                                but every role reaches the "my" views. */}
                                            <Route path="/task-reports">
                                                <Route index element={<RequireRole roles={HR_ONLY}><TaskReportsManage /></RequireRole>} />
                                                <Route path="generate" element={<RequireRole roles={HR_ONLY}><TaskReportGenerator /></RequireRole>} />
                                                <Route path="my" element={<MyTaskReports />} />
                                            </Route>

                                            <Route path="/salary-slips">
                                                <Route index element={<RequireRole roles={HR_ONLY}><SalarySlipManagement /></RequireRole>} />
                                                <Route path="my" element={<MySalarySlips />} />
                                            </Route>

                                            <Route path="/profile">
                                                <Route index element={<GetProfile />} />
                                                <Route path="documents" element={<DocumentsPage />} />
                                            </Route>

                                            <Route path="/salary" element={<RequireRole roles={HR_ONLY}><SalaryHub /></RequireRole>} />
                                            <Route path="/salary-structures" element={<RequireRole roles={HR_ONLY}><SalaryStructureManagement /></RequireRole>} />
                                            <Route path="/requests" element={<MyRequests />} />
                                            <Route path="/expenses/my" element={<MyExpenses />} />

                                            <Route path="/admin">
                                                <Route path="requests" element={<RequireRole roles={HR_ONLY}><AdminRequestsPage /></RequireRole>} />
                                                <Route path="expenses" element={<RequireRole roles={HR_ONLY}><ExpenseManagement /></RequireRole>} />
                                            </Route>

                                            <Route path="/chatbot" element={<ChatBot />} />
                                        </Route>

                                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                                        <Route path="*" element={<NotFound />} />
                                    </Routes>
                                </Suspense>
                            </BrowserRouter>
                            </ConfirmProvider>
                        </ThemeProvider>
                    </QueryClientProvider>
                </Toaster>
            </LoaderGate>
        </ErrorBoundary>
    </StrictMode>,
)
