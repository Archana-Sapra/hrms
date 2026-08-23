import AppearanceSettings from '../hr/settings/AppearanceSettings';

/**
 * Standalone Appearance page.
 *
 * HR and admins reach the theme picker through Settings, which employees are
 * not allowed into. This gives every role its own route to the same control.
 */
const AppearancePage = () => (
  <div className="min-h-full bg-background p-4 md:p-8">
    <div className="max-w-4xl mx-auto">
      <AppearanceSettings />
    </div>
  </div>
);

export default AppearancePage;
