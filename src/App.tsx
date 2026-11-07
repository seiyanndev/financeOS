import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Home } from './screens/Home';
import { Placeholder } from './screens/Placeholder';
import { Goals } from './screens/Goals';
import { Money } from './screens/Money';
import { Activity } from './screens/Activity';
import { Insights } from './screens/Insights';
import { Profile } from './screens/Profile';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="money" element={<Money />} />
          <Route path="activity" element={<Activity />} />
          <Route path="goals" element={<Goals />} />
          <Route path="insights" element={<Insights />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Placeholder title="Not found" note="That page doesn't exist." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
