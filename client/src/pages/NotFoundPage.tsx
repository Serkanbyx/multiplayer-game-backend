import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 tabIndex={-1} className="text-6xl font-bold text-primary focus:outline-none">404</h1>
      <p className="mt-4 text-lg text-fg-muted">Page not found.</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        <Home className="h-4 w-4" />
        Go Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
