import { Routes, Route, NavLink } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SessionPage } from './pages/SessionPage';
import { LearningOverviewPage } from './pages/LearningOverviewPage';
import { SandboxPage } from './pages/SandboxPage';
import { ThemeToggle } from './components/ThemeToggle';

const NAV_LINKS = [
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/overview', label: 'Overview' },
  { to: '/sandbox', label: 'Sandbox' },
  { to: '/onboarding', label: 'Onboarding' },
];

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__brand-mark">🐍</span>
          Pytho Trainer
        </div>
        <div className="app-header__right">
          <nav className="app-nav">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<RoadmapPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/sessions/:sessionId" element={<SessionPage />} />
          <Route path="/overview" element={<LearningOverviewPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
