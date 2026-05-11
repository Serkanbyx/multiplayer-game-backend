import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ConnectionBanner } from '../system/ConnectionBanner';

export const MainLayout = () => (
  <div className="min-h-screen flex flex-col bg-bg text-fg">
    <ConnectionBanner />
    <Navbar />
    <main className="flex-1">
      <Outlet />
    </main>
    <Footer />
  </div>
);
