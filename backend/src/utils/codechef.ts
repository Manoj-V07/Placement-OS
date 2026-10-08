export interface CodeChefStats {
  available: boolean;
  username: string;
  error?: string;
  rating: number | null;
  stars: number;
  highestRating: number | null;
  globalRank: string | null;
  countryRank: string | null;
  totalSolved: number;
  contestsParticipated: number;
  ratingHistory: Array<{
    contestCode: string;
    contestName: string;
    rating: number;
    ranking: number;
    date: string;
    color?: string;
  }>;
  recentActivity: Array<{
    time: string;
    problemName: string;
    problemUrl?: string;
    status: string;
    lang: string;
  }>;
  syncedAt: string;
}

export async function fetchCodeChefStats(username: string): Promise<CodeChefStats> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return {
      available: false,
      username: '',
      error: 'Username is empty',
      rating: null,
      stars: 0,
      highestRating: null,
      globalRank: null,
      countryRank: null,
      totalSolved: 0,
      contestsParticipated: 0,
      ratingHistory: [],
      recentActivity: [],
      syncedAt: new Date().toISOString()
    };
  }

  try {
    const profileRes = await fetch(`https://www.codechef.com/users/${encodeURIComponent(cleanUsername)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      signal: AbortSignal.timeout(12000)
    });

    if (profileRes.status === 404) {
      return {
        available: false,
        username: cleanUsername,
        error: 'CodeChef user not found or invalid handle',
        rating: null,
        stars: 0,
        highestRating: null,
        globalRank: null,
        countryRank: null,
        totalSolved: 0,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    if (!profileRes.ok) {
      return {
        available: false,
        username: cleanUsername,
        error: `CodeChef returned status ${profileRes.status}`,
        rating: null,
        stars: 0,
        highestRating: null,
        globalRank: null,
        countryRank: null,
        totalSolved: 0,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    const html = await profileRes.text();

    if (html.includes('Just a moment...') || html.includes('cf-browser-verification')) {
      return {
        available: false,
        username: cleanUsername,
        error: 'CodeChef platform protection / rate limit active. Public data temporarily unavailable.',
        rating: null,
        stars: 0,
        highestRating: null,
        globalRank: null,
        countryRank: null,
        totalSolved: 0,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    const hasProfile = html.includes('user-details-container') || html.includes('rating-header') || html.includes('class="user-details"') || html.includes('class="rating-ranks"');
    if (!hasProfile) {
      return {
        available: false,
        username: cleanUsername,
        error: 'CodeChef user profile not found or handle does not exist',
        rating: null,
        stars: 0,
        highestRating: null,
        globalRank: null,
        countryRank: null,
        totalSolved: 0,
        contestsParticipated: 0,
        ratingHistory: [],
        recentActivity: [],
        syncedAt: new Date().toISOString()
      };
    }

    // 1. Current Rating
    const ratingMatch = html.match(/<div class="rating-number"[^>]*>\s*([0-9\?]+)\s*<\/div>/i);
    const rating = ratingMatch && !isNaN(parseInt(ratingMatch[1])) ? parseInt(ratingMatch[1]) : null;

    // 2. Stars
    const starSpan = html.match(/class="rating-star"[^>]*>([\s\S]*?)<\/div>/i) || html.match(/class="rating-star"[^>]*>([\s\S]*?)<\/span>/i);
    const starsCount = starSpan ? (starSpan[1].match(/(★|&#9733;)/g) || []).length : 0;

    // 3. Highest Rating
    const highestRatingMatch = html.match(/Highest Rating\s*<small>\s*\(?(\d+)\)?/i) || html.match(/Highest Rating[^\d]*(\d+)/i);
    const highestRating = highestRatingMatch ? parseInt(highestRatingMatch[1]) : null;

    // 4. Global Rank & Country Rank
    let globalRank: string | null = null;
    let countryRank: string | null = null;
    const rankBlock = html.match(/class="rating-ranks"[\s\S]*?<\/ul>/i);
    if (rankBlock) {
      const gMatch = rankBlock[0].match(/<a href="\/ratings\/all"[^>]*>\s*<strong>\s*([^<]+?)\s*<\/strong>/i);
      if (gMatch) globalRank = gMatch[1].trim();

      const cMatch = rankBlock[0].match(/filterBy=Country[^>]*>\s*<strong>\s*([^<]+?)\s*<\/strong>/i);
      if (cMatch) countryRank = cMatch[1].trim();
    }

    // 5. Total Solved Problems
    const fullySolvedPart = html.match(/Total Problems Solved:\s*(\d+)/i) || html.match(/Problems Solved[^\d]*(\d+)/i) || html.match(/Fully Solved[^\d]*(\d+)/i);
    const totalSolved = fullySolvedPart ? parseInt(fullySolvedPart[1]) : 0;

    // 6. Rating history from embedded script
    const chartDataMatch = html.match(/var all_rating = (\[.*?\]);/s);
    let ratingHistory: CodeChefStats['ratingHistory'] = [];
    if (chartDataMatch) {
      try {
        const rawHistory = JSON.parse(chartDataMatch[1]);
        ratingHistory = rawHistory.map((item: any) => ({
          contestCode: item.code || '',
          contestName: item.name || '',
          rating: item.rating ? parseInt(item.rating) : 0,
          ranking: item.rank ? parseInt(item.rank) : 0,
          date: item.end_date || `${item.getyear}-${String(item.getmonth).padStart(2, '0')}-${String(item.getday).padStart(2, '0')}`,
          color: item.color
        }));
      } catch (e) {
        // silent json parse fallback
      }
    }

    // 7. Recent Submissions
    let recentActivity: CodeChefStats['recentActivity'] = [];
    try {
      const recentRes = await fetch(`https://www.codechef.com/recent/user?page=0&user_handle=${encodeURIComponent(cleanUsername)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (recentRes.ok) {
        const recentData = (await recentRes.json()) as any;
        if (recentData?.content) {
          const trMatches = [...recentData.content.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)];
          const rows = trMatches.slice(1); // skip table header
          recentActivity = rows.map(r => {
            const tds = [...r[1].matchAll(/<td[^>]*>(.*?)<\/td>/gis)].map(td => td[1]);
            if (tds.length < 4) return null;

            const timeMatch = tds[0].match(/title='([^']+)'/) || tds[0].match(/tooltiptext'>([^<]+)</);
            const time = timeMatch ? timeMatch[1].trim() : tds[0].replace(/<[^>]+>/g, '').trim();

            const probMatch = tds[1].match(/<a\s+href='([^']*)'[^>]*>([^<]*)<\/a>/i);
            const problemName = probMatch ? probMatch[2].trim() : tds[1].replace(/<[^>]+>/g, '').trim();
            const problemUrl = probMatch ? `https://www.codechef.com${probMatch[1]}` : undefined;

            const resTitleMatch = tds[2].match(/title='([^']*)'/i);
            const status = resTitleMatch ? resTitleMatch[1].trim() : tds[2].replace(/<[^>]+>/g, '').trim();
            const lang = tds[3].replace(/<[^>]+>/g, '').trim();

            return { time, problemName, problemUrl, status: status || 'Submitted', lang };
          }).filter(Boolean) as CodeChefStats['recentActivity'];
        }
      }
    } catch {
      // Recent activity fetch may fail non-critically without failing the entire profile
    }

    return {
      available: true,
      username: cleanUsername,
      rating: rating ?? (ratingHistory.length > 0 ? ratingHistory[ratingHistory.length - 1].rating : null),
      stars: starsCount,
      highestRating,
      globalRank,
      countryRank,
      totalSolved,
      contestsParticipated: ratingHistory.length,
      ratingHistory,
      recentActivity: recentActivity.slice(0, 15),
      syncedAt: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      available: false,
      username: cleanUsername,
      error: err.name === 'TimeoutError' ? 'CodeChef request timed out' : (err.message || 'Failed to connect to CodeChef'),
      rating: null,
      stars: 0,
      highestRating: null,
      globalRank: null,
      countryRank: null,
      totalSolved: 0,
      contestsParticipated: 0,
      ratingHistory: [],
      recentActivity: [],
      syncedAt: new Date().toISOString()
    };
  }
}
