import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Receipt,
  CreditCard,
  Users,
  Calculator,
  ArrowRight,
  Building,
  TrendingUp
} from "lucide-react";
import SalaryStructureManagement from '../salary/SalaryStructureManagement';
import SalarySlipManagement from '../salary/SalarySlipManagement';
import BackButton from '../../ui/BackButton';
import { formatIndianNumber } from '../../../utils/indianNumber';
import { useSalaryStatistics } from '../../../hooks/queries';
import type { SalaryStatistics } from '../../../types';

type SectionType = 'overview' | 'structure' | 'slips' | 'payroll';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: string | number;
  loading: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, iconColor, label, value, loading }) => (
  <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 ${iconColor} rounded-lg`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {loading ? (
              <div className="animate-pulse bg-slate-200 dark:bg-slate-600 h-8 w-12 rounded"></div>
            ) : (
              value
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface FinancialStatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: string | number;
}

const FinancialStatCard: React.FC<FinancialStatCardProps> = ({ icon: Icon, iconColor, label, value }) => (
  <Card className="border-0 shadow-sm bg-white dark:bg-slate-700">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${iconColor} rounded-lg`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface FeatureBulletProps {
  text: string;
  color: string;
}

const FeatureBullet: React.FC<FeatureBulletProps> = ({ text, color }) => (
  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
    <div className={`w-2 h-2 ${color} rounded-full`}></div>
    {text}
  </div>
);

interface NavigationCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  features: string[];
  featureColor: string;
  hoverColor: string;
  onClick: () => void;
  badge?: string;
  disabled?: boolean;
}

const NavigationCard: React.FC<NavigationCardProps> = ({
  icon: Icon,
  iconColor,
  title,
  description,
  features,
  featureColor,
  hoverColor,
  onClick,
  badge,
  disabled = false
}) => (
  <Card
    className={`border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-700 cursor-pointer group ${
      disabled ? 'opacity-75' : ''
    }`}
    onClick={onClick}
  >
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <div className={`p-3 ${iconColor} rounded-lg ${hoverColor} transition-colors`}>
          <Icon className="h-6 w-6" />
        </div>
        <ArrowRight className={`h-5 w-5 text-slate-400 ${hoverColor.replace('bg-', 'text-').replace('/50', '')} transition-colors`} />
      </div>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-xl mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
        {title}
        {badge && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
            {badge}
          </span>
        )}
      </CardTitle>
      <p className="text-slate-600 dark:text-slate-400 mb-4">{description}</p>
      <div className="space-y-2">
        {features.map((feature, index) => (
          <FeatureBullet key={index} text={feature} color={featureColor} />
        ))}
      </div>
    </CardContent>
  </Card>
);

const SalaryHub: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionType>('overview');

  const { data: statistics, isLoading: loading } = useSalaryStatistics();

  const handleBackToOverview = (): void => {
    setActiveSection('overview');
  };

  const OverviewSection: React.FC = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Salary Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive salary and payroll management system
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={Users}
          iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          label="Total Employees"
          value={statistics?.overview?.totalEmployees || '0'}
          loading={loading}
        />
        <StatCard
          icon={Building}
          iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          label="Active Structures"
          value={statistics?.overview?.activeSalaryStructures || '0'}
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          label="This Month's Slips"
          value={statistics?.currentMonth?.slipsGenerated || '0'}
          loading={loading}
        />
      </div>

      {!loading && statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <FinancialStatCard
            icon={Calculator}
            iconColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
            label="Total Gross Salary"
            value={`₹${formatIndianNumber(statistics.financial.totalGrossSalary)}`}
          />
          <FinancialStatCard
            icon={Users}
            iconColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            label="Without Structure"
            value={statistics.overview.employeesWithoutStructure}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavigationCard
          icon={Calculator}
          iconColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          title="Salary Structure"
          description="Define and manage employee salary components including basic pay, allowances, and benefits."
          features={[
            'Create salary structures',
            'Manage allowances',
            'Calculate gross salary'
          ]}
          featureColor="bg-blue-500"
          hoverColor="group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 group-hover:text-blue-600 dark:group-hover:text-blue-400"
          onClick={() => setActiveSection('structure')}
        />

        <NavigationCard
          icon={Receipt}
          iconColor="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
          title="Salary Slip Generation"
          description="Generate, manage, and distribute monthly salary slips with tax calculations and deductions."
          features={[
            'Generate monthly slips',
            'Auto tax calculation',
            'PDF generation'
          ]}
          featureColor="bg-green-500"
          hoverColor="group-hover:bg-green-200 dark:group-hover:bg-green-900/50 group-hover:text-green-600 dark:group-hover:text-green-400"
          onClick={() => setActiveSection('slips')}
        />

        <NavigationCard
          icon={CreditCard}
          iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
          title="Payroll Integration"
          description="Automated payroll processing with Razorpay X integration for seamless salary disbursement."
          features={[
            'Bank transfers',
            'Bulk payments',
            'Payment tracking'
          ]}
          featureColor="bg-purple-500"
          hoverColor="group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 group-hover:text-purple-600 dark:group-hover:text-purple-400"
          onClick={() => setActiveSection('payroll')}
          badge="Coming Soon"
          disabled
        />
      </div>
    </div>
  );

  const PayrollSection: React.FC = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={handleBackToOverview}
          className="dark:border-slate-600 dark:hover:bg-slate-700"
        >
          ← Back to Overview
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Payroll Integration
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Automated payroll processing with Razorpay X
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
        <CardContent className="p-12 text-center">
          <div className="p-6 bg-purple-100 dark:bg-purple-900/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <CreditCard className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Payroll Integration Coming Soon
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            We're working on integrating Razorpay X for automated payroll processing. This will enable direct bank transfers,
            bulk salary payments, and comprehensive payment tracking for your organization.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Automated bank transfers
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Bulk payment processing
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Payment status tracking
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Compliance reporting
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = (): React.ReactNode => {
    switch (activeSection) {
      case 'structure':
        return <SalaryStructureManagement onBack={handleBackToOverview} />;
      case 'slips':
        return <SalarySlipManagement onBack={handleBackToOverview} />;
      case 'payroll':
        return <PayrollSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {activeSection === 'overview' && (
          <div className="mb-6">
            <BackButton label="Back" variant="ghost" className="w-auto" />
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default SalaryHub;
