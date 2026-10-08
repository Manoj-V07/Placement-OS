export interface LeetCodeStats {
  available: boolean;
  username: string;
  error?: string;
  profile?: {
    ranking: number | null;
    reputation: number | null;
  };
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating: number | null;
  globalContestRanking: number | null;
  totalParticipants: number | null;
  topPercentage: number | null;
  contestsParticipated: number;
  ratingHistory: Array<{
    contestTitle: string;
    rating: number;
    ranking: number;
    startTime: number;
    attended: boolean;
  }>;
  recentActivity: Array<{
    title: string;
    titleSlug: string;
    timestamp: string;
    status: string;
    lang: string;
  }>;
  syncedAt: string;
}

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return {
      available: false,
      username: '',
      error: 'Username is empty',
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      contestRating: null,
      globalContestRanking: null,
      totalParticipants: null,
      topPercentage: null,
      contestsParticipated: 0,
      ratingHistory: [],
      recentActivity: [],
      syncedAt: new Date().toISOString()
    };
  }

  const query = {
    query: `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStatsGlobal {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            reputation
          }
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
        }
        userContestRankingHistory(username: $username) {
          attended
          rating
          ranking
          contest {
            title
            startTime
          }
        }
        recentSubmissionList(username: $username, limit: 15) {
          title
          titleSlug
          timestamp
          statusDisplay
          lang
        }
      }
    `,
    variables: { username: cleanUsername }
  };

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return {
        available: false,
        username: cleanUsername,
        error: `LeetCode API returned status ${response.status}`,
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        contestRating: null,
        globalContestRanking: null,
        totalParticipants: null,
        topPercentage: null,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    const json = (await response.json()) as any;

    if (!json?.data?.matchedUser) {
      return {
        available: false,
        username: cleanUsername,
        error: 'LeetCode user not found or profile is private',
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
        contestRating: null,
        globalContestRanking: null,
        totalParticipants: null,
        topPercentage: null,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    const matchedUser = json.data.matchedUser;
    const acSubmissions = matchedUser.submitStatsGlobal?.acSubmissionNum || [];

    const totalSolved = acSubmissions.find((x: any) => x.difficulty === 'All')?.count ?? 0;
    const easySolved = acSubmissions.find((x: any) => x.difficulty === 'Easy')?.count ?? 0;
    const mediumSolved = acSubmissions.find((x: any) => x.difficulty === 'Medium')?.count ?? 0;
    const hardSolved = acSubmissions.find((x: any) => x.difficulty === 'Hard')?.count ?? 0;

    const contestRanking = json.data.userContestRanking;
    const contestHistoryRaw = json.data.userContestRankingHistory || [];
    const recentSubmissionsRaw = json.data.recentSubmissionList || [];

    const ratingHistory = contestHistoryRaw
      .filter((c: any) => c.attended)
      .map((c: any) => ({
        contestTitle: c.contest?.title || 'Contest',
        rating: Math.round(c.rating || 0),
        ranking: c.ranking || 0,
        startTime: c.contest?.startTime || 0,
        attended: c.attended
      }));

    const recentActivity = recentSubmissionsRaw.map((s: any) => ({
      title: s.title || '',
      titleSlug: s.titleSlug || '',
      timestamp: s.timestamp ? new Date(parseInt(s.timestamp) * 1000).toISOString() : new Date().toISOString(),
      status: s.statusDisplay || 'Submitted',
      lang: s.lang || 'Unknown'
    }));

    return {
      available: true,
      username: cleanUsername,
      profile: {
        ranking: matchedUser.profile?.ranking ?? null,
        reputation: matchedUser.profile?.reputation ?? null
      },
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      contestRating: contestRanking?.rating ? Math.round(contestRanking.rating) : null,
      globalContestRanking: contestRanking?.globalRanking ?? null,
      totalParticipants: contestRanking?.totalParticipants ?? null,
      topPercentage: contestRanking?.topPercentage ? Number(contestRanking.topPercentage.toFixed(2)) : null,
      contestsParticipated: contestRanking?.attendedContestsCount ?? ratingHistory.length,
      ratingHistory,
      recentActivity,
      syncedAt: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      available: false,
      username: cleanUsername,
      error: err.name === 'TimeoutError' ? 'LeetCode API request timed out' : (err.message || 'Failed to connect to LeetCode'),
      totalSolved: 0,
      easySolved: 0,
      mediumSolved: 0,
      hardSolved: 0,
      contestRating: null,
      globalContestRanking: null,
      totalParticipants: null,
      topPercentage: null,
      contestsParticipated: 0,
      ratingHistory: [],
      recentActivity: [],
      syncedAt: new Date().toISOString()
    };
  }
}
