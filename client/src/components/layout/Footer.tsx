import { Gamepad2 } from 'lucide-react';

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span>&copy; {year} MPG. All rights reserved.</span>
          </div>
          <p className="text-xs">Built with React, Node.js & Socket.IO</p>
        </div>
      </div>
    </footer>
  );
};
