import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Swords, DoorOpen, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { getDashboardStats, type DashboardStats } from '../../api/adminService';

const GAME_TYPE_LABELS: Record<string, string> = {
  tictactoe: 'Tic Tac Toe',
  cardgame: 'Card Game',
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Failed to load dashboard statistics.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner center size="lg" />;

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <p className="text-danger">{error ?? 'Unknown error'}</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-info' },
    { label: 'Total Admins', value: stats.totalAdmins, icon: ShieldCheck, color: 'text-danger' },
    { label: 'Total Matches', value: stats.totalMatches, icon: Swords, color: 'text-success' },
    { label: 'Active Rooms', value: stats.activeRoomsCount, icon: DoorOpen, color: 'text-warning' },
    { label: 'Queue Size', value: stats.queueSize, icon: Clock, color: 'text-primary' },
  ];

  const gameTypeEntries = Object.entries(stats.matchesByGameType);

  return (
    <div className="space-y-8">
      <div>
        <h1 tabIndex={-1} className="text-2xl font-bold text-fg focus:outline-none">Dashboard</h1>
        <p className="mt-1 text-sm text-fg-muted">Overview of platform statistics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`flex items-center justify-center h-12 w-12 rounded-lg bg-surface ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-fg-muted">{label}</p>
              <p className="text-2xl font-bold text-fg">{value.toLocaleString()}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Matches by Game Type */}
      <Card>
        <h2 className="text-lg font-semibold text-fg mb-4">Matches by Game Type</h2>
        {gameTypeEntries.length === 0 ? (
          <p className="text-sm text-fg-muted">No match data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 font-medium text-fg-muted">Game Type</th>
                  <th className="pb-3 font-medium text-fg-muted text-right">Matches</th>
                  <th className="pb-3 font-medium text-fg-muted text-right">Share</th>
                  <th className="pb-3 font-medium text-fg-muted pl-4">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {gameTypeEntries.map(([type, count]) => {
                  const percent = stats.totalMatches > 0 ? (count / stats.totalMatches) * 100 : 0;
                  return (
                    <tr key={type} className="border-b border-border/50 last:border-0">
                      <td className="py-3 text-fg font-medium">
                        {GAME_TYPE_LABELS[type] ?? type}
                      </td>
                      <td className="py-3 text-fg text-right tabular-nums">
                        {count.toLocaleString()}
                      </td>
                      <td className="py-3 text-fg-muted text-right tabular-nums">
                        {percent.toFixed(1)}%
                      </td>
                      <td className="py-3 pl-4">
                        <div className="h-2.5 w-full max-w-[200px] rounded-full bg-surface">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
