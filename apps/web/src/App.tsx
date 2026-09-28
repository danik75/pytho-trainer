import { useEffect, useState } from 'react';

interface UserStatus {
  id: string;
  goals: string;
  selectedDomains: string[];
}

function App() {
  const [user, setUser] = useState<UserStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<UserStatus>;
      })
      .then(setUser)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <main>
      <h1>Pytho Trainer</h1>
      {error && <p role="alert">Could not reach the server: {error}</p>}
      {!error && !user && <p>Loading...</p>}
      {user && (
        <p>
          Connected as <code>{user.id}</code>.
        </p>
      )}
    </main>
  );
}

export default App;
