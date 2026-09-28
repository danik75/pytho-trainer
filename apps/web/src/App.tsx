import { Routes, Route, Link } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SessionPage } from './pages/SessionPage';
import { LearningOverviewPage } from './pages/LearningOverviewPage';

function App() {
  return (
    <main>
      <nav>
        <Link to="/roadmap">Roadmap</Link> | <Link to="/overview">Overview</Link> |{' '}
        <Link to="/onboarding">Onboarding</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RoadmapPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/sessions/:sessionId" element={<SessionPage />} />
        <Route path="/overview" element={<LearningOverviewPage />} />
      </Routes>
    </main>
  );
}

export default App;
