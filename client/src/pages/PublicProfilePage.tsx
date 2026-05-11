import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { PublicUser } from '@mpg/shared/types/user';
import { getPublicProfile } from '../api/userService';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader, GameStatsCard, getGameLabel, MatchList } from '../components/profile';
import { Tabs, Spinner, EmptyState, Card } from '../components/ui';

const PublicProfilePage = () => {
  const { username } = useParams<{ username: string }>();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPublicProfile(username);
      setProfile(data);
    } catch {
      setError('User not found.');
      toast.error('Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Spinner center />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <EmptyState
            icon="👤"
            heading="User not found"
            description="The profile you're looking for doesn't exist."
          />
        </Card>
      </div>
    );
  }

  const hasStats = !!profile.statsByGame && Object.keys(profile.statsByGame).length > 0;

  const statsContent = hasStats ? (
    <div className="space-y-4">
      {Object.entries(profile.statsByGame!).map(([gameType, stats]) => (
        <GameStatsCard
          key={gameType}
          gameLabel={getGameLabel(gameType)}
          stats={stats}
        />
      ))}
    </div>
  ) : (
    <Card>
      <EmptyState
        icon="🔒"
        heading="Stats are hidden"
        description="This user has hidden their stats."
      />
    </Card>
  );

  const matchesContent = (
    <MatchList username={profile.username} currentUserId={authUser?._id} />
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <ProfileHeader
        displayName={profile.displayName}
        username={profile.username}
        avatarUrl={profile.avatarUrl}
        role={profile.role}
        bio={profile.bio}
        createdAt={profile.createdAt}
      />

      <Tabs
        tabs={[
          { id: 'stats', label: 'Stats', content: statsContent },
          { id: 'matches', label: 'Recent Matches', content: matchesContent },
        ]}
        defaultTab="stats"
      />
    </div>
  );
};

export default PublicProfilePage;
