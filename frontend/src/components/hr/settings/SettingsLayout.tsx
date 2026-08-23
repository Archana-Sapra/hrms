import React, { type ReactNode } from 'react';
import { Settings, Clock, Building2, Bell, MapPin, Palette, type LucideIcon } from 'lucide-react';

interface SettingsNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SettingsLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ activeSection, onSectionChange, children }) => {
  const settingsNav: SettingsNavItem[] = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'geofence', label: 'Geo Fence', icon: MapPin },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'general', label: 'General', icon: Settings }
  ];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Sticky Tab Bar */}
        <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
          <div className="px-4 sm:px-6">
            <div className="flex items-center gap-4 sm:gap-6 py-3 sm:py-4">
              {/* Settings Title - Hidden on mobile for space */}
              <h1 className="hidden sm:block text-lg font-semibold text-foreground shrink-0">
                Settings
              </h1>

              {/* Vertical Divider - Hidden on mobile */}
              <div className="hidden sm:block w-px h-6 bg-border" />

              {/* Horizontal Tab Navigation */}
              <nav className="flex-1 flex overflow-x-auto scrollbar-hide gap-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onSectionChange(item.id)}
                      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                        isActive
                          ? 'text-primary border-primary bg-primary/5'
                          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="hidden sm:inline">{item.label}</span>
                      <span className="sm:hidden text-xs">{item.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SettingsLayout;
