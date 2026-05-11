import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { OwnUser } from '@mpg/shared/types/user';
import * as authService from '../api/authService';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader, GameStatsCard, getGameLabel, MatchList } from '../components/profile';
import { Tabs, Spinner, Card, EmptyState } from '../components/ui';

const MyProfilePage = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<OwnUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await authService.getMe();
      setProfile(data);
    } catch {
      toast.error('Failed to load your profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Card>
          <EmptyState
            icon="⚠️"
            heading="Something went wrong"
            description="We couldn't load your profile. Please try again later."
          />
        </Card>
      </div>
    );
  }

  const statEntries = Object.entries(profile.statsByGame);
  const hasStats = statEntries.length > 0;

  const statsContent = hasStats ? (
    <div className="space-y-4">
      {statEntries.map(([gameType, stats]) => (
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
        icon="🎮"
        heading="No stats yet"
        description="Play some games to start tracking your stats!"
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
        isOwnProfile
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

export default MyProfilePage;
