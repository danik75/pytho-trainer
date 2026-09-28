import { Routes, Route, Link } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { RoadmapPage } from './pages/RoadmapPage';

function App() {
  return (
    <main>
      <nav>
        <Link to="/roadmap">Roadmap</Link> | <Link to="/onboarding">Onboarding</Link>
      </nav>
      <Routes>
        <Route path="/" element={<RoadmapPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Routes>
    </main>
  );
}

export default App;
