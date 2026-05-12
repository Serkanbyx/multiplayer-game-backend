import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1
        tabIndex={-1}
        className="text-[8rem] sm:text-[10rem] font-extrabold leading-none text-primary/20 select-none focus:outline-none"
      >
        404
      </h1>
      <h2 className="-mt-4 text-2xl font-bold text-fg">
        Page not found
      </h2>
      <p className="mt-3 text-fg-muted max-w-xs">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors min-h-[44px]"
      >
        <Home className="h-4 w-4" />
        Go Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
