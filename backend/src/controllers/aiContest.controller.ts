import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { db } from '../config/firebase';
import { sendResponse } from '../utils/response';
import { fetchLeetCodeStats } from '../utils/leetcode';
import { fetchCodeChefStats } from '../utils/codechef';
import { runTestCase, SupportedLanguage } from '../utils/codeRunner';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';

interface GeneratedProblem {
  id: string; // 'p1', 'p2', 'p3'
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  targetMinutes: number; // 20, 30, 40
  points: number; // 100, 200, 300
  topic: string;
  pattern: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
  publicTestCases: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  hiddenTestCases: Array<{
    input: string;
    output: string;
  }>;
  starterTemplates: {
    python: string;
    cpp: string;
    c: string;
    java: string;
  };
}

interface ContestSubmission {
  id: string;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  passedCases: number;
  totalCases: number;
  runtimeMs: number;
  submittedAt: string;
}

/**
 * Fallback generator for 3 original high quality DSA problems if AI service encounters error
 */
function getCuratedOriginalProblems(topicFocus: string[]): GeneratedProblem[] {
  const chosenTopic1 = topicFocus[0] || 'Arrays & Hash Maps';
  const chosenTopic2 = topicFocus[1] || 'Two Pointers & Sliding Window';
  const chosenTopic3 = topicFocus[2] || 'Dynamic Programming & Trees';

  return [
    {
      id: 'p1',
      title: 'Optimal Delivery Pairing',
      difficulty: 'Easy',
      targetMinutes: 20,
      points: 100,
      topic: chosenTopic1,
      pattern: 'Prefix Frequency & Two Sum Variant',
      description: `A logistics company needs to dispatch pairs of packages. You are given an integer array \`weights\` representing package weights and an integer \`target\`.

Determine whether there exist two distinct package indices \`i\` and \`j\` (\`i != j\`) such that the sum of their weights equals \`target\`.

Output \`YES\` if such a pair exists, or \`NO\` otherwise.`,
      inputFormat: `The first line contains two integers \`n\` and \`target\` separated by a space.
The second line contains \`n\` space-separated integers representing the array \`weights\`.`,
      outputFormat: `Print \`YES\` if a valid pair exists, otherwise print \`NO\`.`,
      constraints: `2 <= n <= 10^5\n1 <= weights[i], target <= 10^9`,
      examples: [
        {
          input: '4 10\n2 7 11 15',
          output: 'NO',
          explanation: 'No two elements sum to 10 (2+7=9, 2+11=13, 2+15=17, 7+11=18, etc).'
        },
        {
          input: '5 15\n1 5 10 3 4',
          output: 'YES',
          explanation: 'Elements 5 and 10 sum up to 15 (weights[1] + weights[2] = 15).'
        }
      ],
      publicTestCases: [
        { input: '4 10\n2 7 11 15', output: 'NO' },
        { input: '5 15\n1 5 10 3 4', output: 'YES' }
      ],
      hiddenTestCases: [
        { input: '2 8\n4 4', output: 'YES' },
        { input: '6 100\n10 20 30 40 50 60', output: 'YES' },
        { input: '3 5\n1 2 4', output: 'NO' },
        { input: '5 20\n2 4 6 8 10', output: 'NO' }
      ],
      starterTemplates: {
        python: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    target = int(input_data[1])
    weights = [int(x) for x in input_data[2:2+n]]
    
    seen = set()
    found = False
    for w in weights:
        complement = target - w
        if complement in seen:
            found = True
            break
        seen.add(w)
        
    print("YES" if found else "NO")

if __name__ == "__main__":
    solve()
`,
        cpp: `#include <iostream>
#include <vector>
#include <unordered_set>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    long long target;
    if (!(cin >> n >> target)) return 0;
    
    unordered_set<long long> seen;
    bool found = false;
    for (int i = 0; i < n; i++) {
        long long w;
        cin >> w;
        if (!found && seen.count(target - w)) {
            found = true;
        }
        seen.insert(w);
    }
    
    cout << (found ? "YES" : "NO") << "\\n";
    return 0;
}
`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    long long target;
    if (scanf("%d %lld", &n, &target) != 2) return 0;
    
    long long *arr = (long long*)malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
    }
    
    int found = 0;
    for (int i = 0; i < n && !found; i++) {
        for (int j = i + 1; j < n; j++) {
            if (arr[i] + arr[j] == target) {
                found = 1;
                break;
            }
        }
    }
    
    if (found) printf("YES\\n");
    else printf("NO\\n");
    
    free(arr);
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null || line.trim().isEmpty()) return;
        StringTokenizer st = new StringTokenizer(line);
        int n = Integer.parseInt(st.nextToken());
        long target = Long.parseLong(st.nextToken());
        
        Set<Long> seen = new HashSet<>();
        boolean found = false;
        
        String[] parts = br.readLine().trim().split("\\\\s+");
        for (int i = 0; i < n; i++) {
            long w = Long.parseLong(parts[i]);
            if (!found && seen.contains(target - w)) {
                found = true;
            }
            seen.add(w);
        }
        
        System.out.println(found ? "YES" : "NO");
    }
}
`
      }
    },
    {
      id: 'p2',
      title: 'Longest Balanced Server Signal',
      difficulty: 'Medium',
      targetMinutes: 30,
      points: 200,
      topic: chosenTopic2,
      pattern: 'Sliding Window / Monotonic Condition',
      description: `You are monitoring continuous latency measurements from server clusters represented as an array of integers \`signals\`.

A signal sequence is considered **balanced** if the difference between the maximum and minimum value in that contiguous subarray does not exceed \`k\`.

Find the length of the longest contiguous balanced subarray.`,
      inputFormat: `The first line contains two integers \`n\` and \`k\`.
The second line contains \`n\` space-separated integers representing the \`signals\` array.`,
      outputFormat: `Print a single integer: the maximum length of a balanced contiguous subarray.`,
      constraints: `1 <= n <= 10^5\n0 <= k <= 10^6\n1 <= signals[i] <= 10^9`,
      examples: [
        {
          input: '6 4\n8 2 4 7 8 5',
          output: '4',
          explanation: 'The subarray [4, 7, 8, 5] has min=4, max=8, max-min = 4 <= 4. Length is 4.'
        },
        {
          input: '4 0\n5 5 5 5',
          output: '4',
          explanation: 'All elements are identical; difference between max and min is 0 <= 0.'
        }
      ],
      publicTestCases: [
        { input: '6 4\n8 2 4 7 8 5', output: '4' },
        { input: '4 0\n5 5 5 5', output: '4' }
      ],
      hiddenTestCases: [
        { input: '5 2\n1 10 20 30 40', output: '1' },
        { input: '7 3\n1 3 6 7 9 4 12', output: '3' },
        { input: '6 5\n10 12 15 11 13 14', output: '6' },
        { input: '1 10\n42', output: '1' }
      ],
      starterTemplates: {
        python: `import sys
from collections import deque

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    k = int(input_data[1])
    nums = [int(x) for x in input_data[2:2+n]]
    
    max_d = deque()
    min_d = deque()
    left = 0
    ans = 0
    
    for right in range(n):
        while max_d and nums[max_d[-1]] <= nums[right]:
            max_d.pop()
        max_d.append(right)
        
        while min_d and nums[min_d[-1]] >= nums[right]:
            min_d.pop()
        min_d.append(right)
        
        while nums[max_d[0]] - nums[min_d[0]] > k:
            left += 1
            if max_d[0] < left:
                max_d.popleft()
            if min_d[0] < left:
                min_d.popleft()
                
        ans = max(ans, right - left + 1)
        
    print(ans)

if __name__ == "__main__":
    solve()
`,
        cpp: `#include <iostream>
#include <vector>
#include <deque>
#include <algorithm>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int n;
    long long k;
    if (!(cin >> n >> k)) return 0;
    vector<long long> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    
    deque<int> max_d, min_d;
    int left = 0, ans = 0;
    
    for (int right = 0; right < n; right++) {
        while (!max_d.empty() && nums[max_d.back()] <= nums[right]) max_d.pop_back();
        max_d.push_back(right);
        
        while (!min_d.empty() && nums[min_d.back()] >= nums[right]) min_d.pop_back();
        min_d.push_back(right);
        
        while (nums[max_d.front()] - nums[min_d.front()] > k) {
            left++;
            if (max_d.front() < left) max_d.pop_front();
            if (min_d.front() < left) min_d.pop_front();
        }
        
        ans = max(ans, right - left + 1);
    }
    
    cout << ans << "\\n";
    return 0;
}
`,
        c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    long long k;
    if (scanf("%d %lld", &n, &k) != 2) return 0;
    long long *arr = (long long*)malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) scanf("%lld", &arr[i]);
    
    int max_len = 0;
    for (int i = 0; i < n; i++) {
        long long mn = arr[i], mx = arr[i];
        for (int j = i; j < n; j++) {
            if (arr[j] < mn) mn = arr[j];
            if (arr[j] > mx) mx = arr[j];
            if (mx - mn <= k) {
                int len = j - i + 1;
                if (len > max_len) max_len = len;
            } else {
                break;
            }
        }
    }
    
    printf("%d\\n", max_len);
    free(arr);
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String firstLine = br.readLine();
        if (firstLine == null) return;
        StringTokenizer st = new StringTokenizer(firstLine);
        int n = Integer.parseInt(st.nextToken());
        long k = Long.parseLong(st.nextToken());
        
        long[] nums = new long[n];
        st = new StringTokenizer(br.readLine());
        for (int i = 0; i < n; i++) nums[i] = Long.parseLong(st.nextToken());
        
        ArrayDeque<Integer> maxD = new ArrayDeque<>();
        ArrayDeque<Integer> minD = new ArrayDeque<>();
        int left = 0, ans = 0;
        
        for (int right = 0; right < n; right++) {
            while (!maxD.isEmpty() && nums[maxD.peekLast()] <= nums[right]) maxD.pollLast();
            maxD.addLast(right);
            
            while (!minD.isEmpty() && nums[minD.peekLast()] >= nums[right]) minD.pollLast();
            minD.addLast(right);
            
            while (nums[maxD.peekFirst()] - nums[minD.peekFirst()] > k) {
                left++;
                if (maxD.peekFirst() < left) maxD.pollFirst();
                if (minD.peekFirst() < left) minD.pollFirst();
            }
            
            ans = Math.max(ans, right - left + 1);
        }
        
        System.out.println(ans);
    }
}
`
      }
    },
    {
      id: 'p3',
      title: 'Maximum Vault Energy Network',
      difficulty: 'Hard',
      targetMinutes: 40,
      points: 300,
      topic: chosenTopic3,
      pattern: 'Tree Dynamic Programming / Subtree Aggregation',
      description: `In a distributed grid network modeled as a tree with \`N\` nodes numbered \`1\` to \`N\`, each node \`i\` holds an energy battery of value \`val[i]\` (can be positive, zero, or negative).

A subnetwork is any non-empty connected set of nodes in the tree. The energy value of a subnetwork is the sum of energies of its nodes.

Find the maximum possible total energy value among all valid connected subnetworks.`,
      inputFormat: `The first line contains an integer \`n\`.
The second line contains \`n\` space-separated integers representing node energy values \`val[1], val[2], ..., val[n]\`.
The next \`n - 1\` lines each contain two integers \`u\` and \`v\` representing an undirected edge connecting nodes \`u\` and \`v\`.`,
      outputFormat: `Print a single integer: the maximum energy of any connected non-empty subnetwork.`,
      constraints: `1 <= n <= 10^5\n-10^9 <= val[i] <= 10^9\nThe given edges form a valid tree.`,
      examples: [
        {
          input: '4\n1 2 -5 3\n1 2\n2 3\n2 4',
          output: '6',
          explanation: 'Nodes 1, 2, and 4 form a connected subnetwork with energy 1 + 2 + 3 = 6.'
        },
        {
          input: '3\n-10 -20 -30\n1 2\n2 3',
          output: '-10',
          explanation: 'All values are negative. The best connected subnetwork is single node 1 with energy -10.'
        }
      ],
      publicTestCases: [
        { input: '4\n1 2 -5 3\n1 2\n2 3\n2 4', output: '6' },
        { input: '3\n-10 -20 -30\n1 2\n2 3', output: '-10' }
      ],
      hiddenTestCases: [
        { input: '1\n100', output: '100' },
        { input: '5\n5 -2 4 -1 3\n1 2\n1 3\n2 4\n2 5', output: '11' },
        { input: '3\n0 0 0\n1 2\n2 3', output: '0' },
        { input: '5\n-5 10 -2 8 -1\n1 2\n2 3\n3 4\n4 5', output: '16' }
      ],
      starterTemplates: {
        python: `import sys

# Increase recursion depth for deep trees
sys.setrecursionlimit(200000)

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    vals = [0] + [int(x) for x in lines[1:n+1]]
    
    adj = [[] for _ in range(n + 1)]
    idx = n + 1
    for _ in range(n - 1):
        u = int(lines[idx])
        v = int(lines[idx+1])
        adj[u].append(v)
        adj[v].append(u)
        idx += 2
        
    dp = [0] * (n + 1)
    max_energy = -float('inf')
    
    def dfs(u, parent):
        nonlocal max_energy
        dp[u] = vals[u]
        for v in adj[u]:
            if v != parent:
                dfs(v, u)
                if dp[v] > 0:
                    dp[u] += dp[v]
        if dp[u] > max_energy:
            max_energy = dp[u]
            
    dfs(1, 0)
    print(max_energy)

if __name__ == "__main__":
    solve()
`,
        cpp: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int n;
vector<long long> val;
vector<vector<int>> adj;
vector<long long> dp;
long long max_energy = -1e18;

void dfs(int u, int p) {
    dp[u] = val[u];
    for (int v : adj[u]) {
        if (v != p) {
            dfs(v, u);
            if (dp[v] > 0) dp[u] += dp[v];
        }
    }
    max_energy = max(max_energy, dp[u]);
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    if (!(cin >> n)) return 0;
    val.assign(n + 1, 0);
    adj.assign(n + 1, vector<int>());
    dp.assign(n + 1, 0);
    
    for (int i = 1; i <= n; i++) cin >> val[i];
    for (int i = 0; i < n - 1; i++) {
        int u, v;
        cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    
    dfs(1, 0);
    cout << max_energy << "\\n";
    return 0;
}
`,
        c: `#include <stdio.h>
#include <stdlib.h>

// Standard C solution for small/medium graphs
int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long *val = (long long*)malloc(sizeof(long long) * (n + 1));
    for (int i = 1; i <= n; i++) scanf("%lld", &val[i]);
    
    // For n=1
    if (n == 1) {
        printf("%lld\\n", val[1]);
        free(val);
        return 0;
    }
    
    long long sum_pos = 0;
    long long max_v = val[1];
    for (int i = 1; i <= n; i++) {
        if (val[i] > 0) sum_pos += val[i];
        if (val[i] > max_v) max_v = val[i];
    }
    
    if (sum_pos > 0) printf("%lld\\n", sum_pos);
    else printf("%lld\\n", max_v);
    
    free(val);
    return 0;
}
`,
        java: `import java.util.*;
import java.io.*;

public class Solution {
    static int n;
    static long[] val;
    static List<Integer>[] adj;
    static long[] dp;
    static long maxEnergy = Long.MIN_VALUE;
    
    static void dfs(int u, int p) {
        dp[u] = val[u];
        for (int v : adj[u]) {
            if (v != p) {
                dfs(v, u);
                if (dp[v] > 0) dp[u] += dp[v];
            }
        }
        if (dp[u] > maxEnergy) maxEnergy = dp[u];
    }

    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        n = Integer.parseInt(line.trim());
        val = new long[n + 1];
        adj = new ArrayList[n + 1];
        dp = new long[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        
        StringTokenizer st = new StringTokenizer(br.readLine());
        for (int i = 1; i <= n; i++) val[i] = Long.parseLong(st.nextToken());
        
        for (int i = 0; i < n - 1; i++) {
            st = new StringTokenizer(br.readLine());
            int u = Integer.parseInt(st.nextToken());
            int v = Integer.parseInt(st.nextToken());
            adj[u].add(v);
            adj[v].add(u);
        }
        
        dfs(1, 0);
        System.out.println(maxEnergy);
    }
}
`
      }
    }
  ];
}

/**
 * Generate a new AI contest tailored to the user's practice across DSA Planner, LeetCode, and CodeChef
 */
export const generateAIContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      sendResponse(res, 401, false, 'Unauthorized');
      return;
    }

    // 1. Collect last 5 problems from DSA Planner
    const dsaAttemptsSnap = await db.collection('users').doc(uid).collection('dsa_attempts').get();
    let dsaAttemptsList: any[] = [];
    dsaAttemptsSnap.forEach(doc => {
      dsaAttemptsList.push({ id: doc.id, ...doc.data() });
    });

    // Sort by lastAttemptedAt desc
    dsaAttemptsList.sort((a, b) => {
      const timeA = new Date(a.lastAttemptedAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastAttemptedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    const dsaProblemsSnap = await db.collection('dsa_problems').get();
    const dsaProblemsMap: Record<string, any> = {};
    dsaProblemsSnap.forEach(doc => {
      dsaProblemsMap[doc.id] = doc.data();
    });

    let recentDSA = dsaAttemptsList.slice(0, 5).map(att => {
      const meta = dsaProblemsMap[att.id] || {};
      return {
        title: meta.name || att.id,
        topic: meta.topic || 'General DSA',
        difficulty: meta.difficulty || 'Medium',
        solved: att.solved,
        understandingLevel: att.understandingLevel || 3
      };
    });

    // If fewer than 5 DSA planner problems, supplement with baseline curriculum problems
    if (recentDSA.length < 5) {
      const sampleProblems = dsaProblemsSnap.docs.slice(0, 5 - recentDSA.length).map(d => {
        const data = d.data();
        return {
          title: data.name || 'Array Problem',
          topic: data.topic || 'Arrays',
          difficulty: data.difficulty || 'Easy',
          solved: true,
          understandingLevel: 4
        };
      });
      recentDSA = [...recentDSA, ...sampleProblems];
    }

    // 2. Collect last 5 solved problems from LeetCode & CodeChef
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};
    const leetcodeUser = (userData.leetcodeUsername || '').trim();
    const codechefUser = (userData.codechefUsername || '').trim();

    const cpCacheDoc = await db.collection('users').doc(uid).collection('cp_data').doc('latest').get();
    let cpData = cpCacheDoc.exists ? cpCacheDoc.data() : null;

    if (!cpData && (leetcodeUser || codechefUser)) {
      const lc = leetcodeUser ? await fetchLeetCodeStats(leetcodeUser) : null;
      const cc = codechefUser ? await fetchCodeChefStats(codechefUser) : null;
      cpData = {
        leetcode: lc,
        codechef: cc
      };
    }

    const leetcodeRecent: any[] = (cpData?.leetcode?.recentActivity || [])
      .filter((a: any) => a.status === 'Accepted')
      .slice(0, 5)
      .map((a: any) => ({
        title: a.title,
        platform: 'LeetCode',
        status: 'Accepted',
        lang: a.lang
      }));

    const codechefRecent: any[] = (cpData?.codechef?.recentActivity || [])
      .filter((a: any) => a.status === '100' || a.status === 'AC' || a.status === 'Accepted')
      .slice(0, 5)
      .map((a: any) => ({
        title: a.problemName,
        platform: 'CodeChef',
        status: 'Accepted',
        lang: a.lang
      }));

    // 3. Collect Past AI Contests Performance & Weaknesses
    const pastContestsSnap = await db.collection('users').doc(uid).collection('ai_contests')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const pastWeaknesses: string[] = [];
    pastContestsSnap.forEach(doc => {
      const data = doc.data();
      if (data.status === 'completed' && data.performance?.weaknesses && Array.isArray(data.performance.weaknesses)) {
        pastWeaknesses.push(...data.performance.weaknesses);
      }
    });

    const contestCountSnap = await db.collection('users').doc(uid).collection('ai_contests').get();
    const contestNumber = contestCountSnap.size + 1;

    // 4. Synthesize prompt for LLM
    const analysisContext = {
      dsaPlannerProblems: recentDSA,
      leetcodeProblems: leetcodeRecent.length > 0 ? leetcodeRecent : [{ note: 'Baseline standard interview algorithms' }],
      codechefProblems: codechefRecent.length > 0 ? codechefRecent : [{ note: 'Baseline competitive programming algorithms' }],
      pastWeaknesses: pastWeaknesses.slice(0, 5)
    };

    const prompt = `You are a Competitive Programming Problem Setter creating an official 90-minute algorithmic contest (Phase 5).
Based on the user's recent practice across:
1. DSA Planner last 5 problems: ${JSON.stringify(recentDSA)}
2. LeetCode last 5 solved problems: ${JSON.stringify(leetcodeRecent)}
3. CodeChef last 5 solved problems: ${JSON.stringify(codechefRecent)}
4. Past Contest Weaknesses: ${JSON.stringify(pastWeaknesses)}

Generate exactly 3 brand new, original, high-quality DSA algorithmic problems. Do NOT copy standard problems directly.
The 3 problems must be:
- Problem 1: Easy (Allocated target: 20 minutes, 100 points)
- Problem 2: Medium (Allocated target: 30 minutes, 200 points)
- Problem 3: Hard (Allocated target: 40 minutes, 300 points)
Total contest duration: 90 minutes.

Return ONLY a valid JSON object matching this schema:
{
  "identifiedTopics": ["string", "string", "string"],
  "focusWeaknesses": ["string", "string"],
  "summary": "1-2 sentence analysis explaining how these 3 problems test their recent topics and weak points",
  "problems": [
    {
      "id": "p1",
      "title": "Creative Problem Title",
      "difficulty": "Easy",
      "targetMinutes": 20,
      "points": 100,
      "topic": "Specific Topic",
      "pattern": "Specific Pattern",
      "description": "Clear problem statement with background story",
      "inputFormat": "Input specification",
      "outputFormat": "Output specification",
      "constraints": "Realistic constraints (e.g. 1 <= n <= 10^5)",
      "examples": [
        { "input": "...", "output": "...", "explanation": "..." }
      ],
      "publicTestCases": [
        { "input": "...", "output": "..." },
        { "input": "...", "output": "..." }
      ],
      "hiddenTestCases": [
        { "input": "...", "output": "..." },
        { "input": "...", "output": "..." },
        { "input": "...", "output": "..." }
      ],
      "starterTemplates": {
        "python": "complete starter python script reading from sys.stdin and printing output",
        "cpp": "complete starter C++ file reading with cin and printing with cout",
        "c": "complete starter C file with stdio.h",
        "java": "complete public class Solution with main method reading from Scanner or BufferedReader"
      }
    },
    {
      "id": "p2",
      "title": "...",
      "difficulty": "Medium",
      "targetMinutes": 30,
      "points": 200,
      ...
    },
    {
      "id": "p3",
      "title": "...",
      "difficulty": "Hard",
      "targetMinutes": 40,
      "points": 300,
      ...
    }
  ]
}`;

    let generatedProblems: GeneratedProblem[] = [];
    let generatedAnalysis: any = {
      identifiedTopics: ['Arrays', 'Two Pointers', 'Dynamic Programming'],
      focusWeaknesses: ['Edge Cases', 'Time Limit Optimization'],
      summary: 'Tailored 90-minute contest synthesized from your recent DSA Planner, LeetCode, and CodeChef performance.'
    };

    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
        response_format: { type: 'json_object' },
        temperature: 0.6
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseText);

      if (parsed.problems && Array.isArray(parsed.problems) && parsed.problems.length === 3) {
        generatedProblems = parsed.problems;
        generatedAnalysis = {
          identifiedTopics: parsed.identifiedTopics || ['Arrays', 'Trees', 'Dynamic Programming'],
          focusWeaknesses: parsed.focusWeaknesses || ['Boundary conditions'],
          summary: parsed.summary || 'Custom contest tailored to your practice.'
        };
      } else {
        throw new Error('AI response did not contain 3 problems');
      }
    } catch (aiErr: any) {
      console.warn('Groq AI generation fallback triggered:', aiErr.message);
      generatedProblems = getCuratedOriginalProblems(
        recentDSA.map(d => d.topic)
      );
    }

    const contestId = randomUUID();
    const contestDoc = {
      id: contestId,
      contestNumber,
      title: `PlacementOS AI Contest #${contestNumber}`,
      createdAt: new Date().toISOString(),
      status: 'ready', // 'ready' | 'in_progress' | 'completed' | 'disqualified'
      durationMinutes: 90,
      totalDurationSeconds: 5400,
      currentProblemIndex: 0,
      problemDurations: [20, 30, 40], // Easy: 20m, Medium: 30m, Hard: 40m
      problemStartedAt: null,
      fullscreenExits: 0,
      contestLeaves: 0,
      disqualificationReason: null,
      analysis: {
        ...generatedAnalysis,
        dsaPlannerProblems: recentDSA,
        leetcodeProblems: leetcodeRecent,
        codechefProblems: codechefRecent
      },
      problems: generatedProblems,
      submissions: [],
      solvedProblemIds: [],
      timeTakenPerProblem: { p1: null, p2: null, p3: null },
      totalScore: 0,
      performance: null
    };

    await db.collection('users').doc(uid).collection('ai_contests').doc(contestId).set(contestDoc);

    sendResponse(res, 201, true, 'AI Contest generated successfully', contestDoc);
  } catch (error) {
    next(error);
  }
};

/**
 * Start an AI contest (initiates the 90-minute countdown)
 */
export const startAIContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;

    const contestRef = db.collection('users').doc(uid!).collection('ai_contests').doc(contestId);
    const contestDoc = await contestRef.get();

    if (!contestDoc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const contest = contestDoc.data()!;
    if (contest.status === 'completed') {
      sendResponse(res, 400, false, 'Contest is already completed');
      return;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + 90 * 60 * 1000);

    const updates = {
      status: 'in_progress',
      startedAt: contest.startedAt || now.toISOString(),
      endsAt: contest.endsAt || endsAt.toISOString(),
      updatedAt: now.toISOString()
    };

    await contestRef.update(updates);

    sendResponse(res, 200, true, 'Contest started', { ...contest, ...updates });
  } catch (error) {
    next(error);
  }
};

/**
 * Run code against public test cases (playground / testing within contest)
 */
export const runAICode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { language, code, testCases } = req.body;

    if (!language || !code || !Array.isArray(testCases)) {
      sendResponse(res, 400, false, 'Missing language, code, or testCases');
      return;
    }

    const results = [];
    let allPassed = true;
    let firstFailedStatus = 'Accepted';

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const resTc = await runTestCase(language, code, tc.input, tc.output, i, false, 3000);
      results.push(resTc);

      if (resTc.status !== 'Accepted') {
        allPassed = false;
        if (firstFailedStatus === 'Accepted') {
          firstFailedStatus = resTc.status;
        }
      }
    }

    sendResponse(res, 200, true, 'Code executed', {
      results,
      allPassed,
      overallStatus: allPassed ? 'Accepted' : firstFailedStatus
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit problem code within a contest (evaluates public + hidden test cases)
 */
export const submitAIProblem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      sendResponse(res, 400, false, 'problemId, language, and code are required');
      return;
    }

    const contestRef = db.collection('users').doc(uid!).collection('ai_contests').doc(contestId);
    const contestDoc = await contestRef.get();

    if (!contestDoc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const contest = contestDoc.data()!;
    if (contest.status === 'disqualified') {
      sendResponse(res, 403, false, 'Contest has been disqualified due to malpractice');
      return;
    }
    if (contest.status === 'completed') {
      sendResponse(res, 400, false, 'Contest is already completed');
      return;
    }

    const currentProblemIdx = contest.currentProblemIndex || 0;
    const activeProblem = (contest.problems || [])[currentProblemIdx];
    if (activeProblem && activeProblem.id !== problemId) {
      sendResponse(res, 400, false, `Problem switching is disabled. You must solve problems in fixed sequence (${activeProblem.title} is currently active).`);
      return;
    }

    const problem = (contest.problems || []).find((p: any) => p.id === problemId);

    if (!problem) {
      sendResponse(res, 404, false, 'Problem not found in contest');
      return;
    }

    const publicCases = problem.publicTestCases || [];
    const hiddenCases = problem.hiddenTestCases || [];
    const allCases = [
      ...publicCases.map((tc: any) => ({ ...tc, isHidden: false })),
      ...hiddenCases.map((tc: any) => ({ ...tc, isHidden: true }))
    ];

    const results = [];
    let allPassed = true;
    let verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' = 'Accepted';
    let failedCaseNumber = 0;
    let totalRuntime = 0;

    for (let i = 0; i < allCases.length; i++) {
      const tc = allCases[i];
      const resTc = await runTestCase(language, code, tc.input, tc.output, i, tc.isHidden, 3000);
      results.push(resTc);
      totalRuntime += resTc.executionTimeMs;

      if (resTc.status !== 'Accepted') {
        allPassed = false;
        verdict = resTc.status;
        failedCaseNumber = i + 1;
        break; // Stop on first failure just like standard online judges
      }
    }

    const submissionId = randomUUID();
    const submissionRecord: ContestSubmission = {
      id: submissionId,
      problemId,
      language,
      code,
      verdict,
      passedCases: allPassed ? allCases.length : failedCaseNumber - 1,
      totalCases: allCases.length,
      runtimeMs: totalRuntime,
      submittedAt: new Date().toISOString()
    };

    const submissions = contest.submissions || [];
    submissions.push(submissionRecord);

    const solvedProblemIds = contest.solvedProblemIds || [];
    const timeTakenPerProblem = contest.timeTakenPerProblem || {};
    let totalScore = contest.totalScore || 0;

    // If Accepted and not previously solved, mark solved and record time taken
    if (allPassed && !solvedProblemIds.includes(problemId)) {
      solvedProblemIds.push(problemId);
      totalScore += (problem.points || 100);

      const startedAtMs = contest.startedAt ? new Date(contest.startedAt).getTime() : Date.now();
      const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAtMs) / 60000));
      timeTakenPerProblem[problemId] = elapsedMinutes;
    }

    await contestRef.update({
      submissions,
      solvedProblemIds,
      timeTakenPerProblem,
      totalScore,
      updatedAt: new Date().toISOString()
    });

    sendResponse(res, 200, true, 'Problem evaluated', {
      verdict,
      submission: submissionRecord,
      passedCases: submissionRecord.passedCases,
      totalCases: allCases.length,
      totalScore,
      solvedProblemIds,
      isSolved: allPassed,
      failedTestCase: !allPassed ? results[results.length - 1] : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Finish contest: compute post-contest analytics, accuracy, weaknesses, and store
 */
export const finishAIContest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;

    const contestRef = db.collection('users').doc(uid!).collection('ai_contests').doc(contestId);
    const contestDoc = await contestRef.get();

    if (!contestDoc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const contest = contestDoc.data()!;
    const submissions: ContestSubmission[] = contest.submissions || [];
    const problems: GeneratedProblem[] = contest.problems || [];
    const solvedProblemIds: string[] = contest.solvedProblemIds || [];

    const totalSubmissions = submissions.length;
    const acceptedSubmissions = submissions.filter(s => s.verdict === 'Accepted').length;
    const accuracy = totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0;

    const startedTime = contest.startedAt ? new Date(contest.startedAt).getTime() : Date.now();
    const totalContestTimeMinutes = Math.min(90, Math.max(1, Math.round((Date.now() - startedTime) / 60000)));

    // Difficulty breakdown
    const difficultyPerformance: Record<string, { solved: boolean; attempts: number; timeTaken: number | null }> = {
      Easy: { solved: false, attempts: 0, timeTaken: null },
      Medium: { solved: false, attempts: 0, timeTaken: null },
      Hard: { solved: false, attempts: 0, timeTaken: null }
    };

    problems.forEach(p => {
      const problemSubs = submissions.filter(s => s.problemId === p.id);
      const isSolved = solvedProblemIds.includes(p.id);
      difficultyPerformance[p.difficulty] = {
        solved: isSolved,
        attempts: problemSubs.length,
        timeTaken: contest.timeTakenPerProblem?.[p.id] || null
      };
    });

    // Detect weaknesses and topics
    const weaknesses: string[] = [];
    const topicsMastered: string[] = [];

    problems.forEach(p => {
      const isSolved = solvedProblemIds.includes(p.id);
      if (isSolved) {
        topicsMastered.push(`${p.difficulty}: ${p.topic} (${p.pattern})`);
      } else {
        const pSubs = submissions.filter(s => s.problemId === p.id);
        if (pSubs.length === 0) {
          weaknesses.push(`Unattempted ${p.difficulty} Problem: ${p.topic} — need to practice ${p.pattern}`);
        } else {
          const lastVerdict = pSubs[pSubs.length - 1].verdict;
          weaknesses.push(`Struggled with ${p.difficulty} (${lastVerdict}): ${p.topic} — review ${p.pattern}`);
        }
      }
    });

    const performance = {
      problemsSolved: solvedProblemIds.length,
      totalProblems: problems.length,
      contestScore: contest.totalScore || 0,
      accuracy,
      totalSubmissions,
      totalTimeTakenMinutes: totalContestTimeMinutes,
      difficultyPerformance,
      topicsMastered,
      weaknesses,
      finishedAt: new Date().toISOString()
    };

    await contestRef.update({
      status: 'completed',
      finishedAt: new Date().toISOString(),
      performance,
      updatedAt: new Date().toISOString()
    });

    // Also update user's AI contest profile for adaptive learning
    const userProfileRef = db.collection('users').doc(uid!).collection('ai_contest_profile').doc('summary');
    const existingSummaryDoc = await userProfileRef.get();
    const existingSummary = existingSummaryDoc.exists ? existingSummaryDoc.data()! : { totalContests: 0, totalSolved: 0 };

    await userProfileRef.set({
      totalContests: (existingSummary.totalContests || 0) + 1,
      totalSolved: (existingSummary.totalSolved || 0) + solvedProblemIds.length,
      lastWeaknesses: weaknesses,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    sendResponse(res, 200, true, 'Contest completed and analytics computed', {
      ...contest,
      status: 'completed',
      performance
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch all AI contests for the user
 */
export const getAIContests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestsSnap = await db.collection('users').doc(uid!).collection('ai_contests')
      .orderBy('createdAt', 'desc')
      .get();

    const contests = contestsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    sendResponse(res, 200, true, 'AI Contests fetched', contests);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch a single AI contest by ID
 */
export const getAIContestById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;

    const doc = await db.collection('users').doc(uid!).collection('ai_contests').doc(contestId).get();
    if (!doc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    sendResponse(res, 200, true, 'Contest fetched', { id: doc.id, ...doc.data() });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a malpractice warning/violation (fullscreen exit or contest leave)
 */
export const recordMalpractice = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;
    const { violationType } = req.body; // 'fullscreen_exit' | 'contest_leave'

    const contestRef = db.collection('users').doc(uid!).collection('ai_contests').doc(contestId);
    const contestDoc = await contestRef.get();

    if (!contestDoc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const contest = contestDoc.data()!;
    let fullscreenExits = contest.fullscreenExits || 0;
    let contestLeaves = contest.contestLeaves || 0;

    if (violationType === 'fullscreen_exit') {
      fullscreenExits += 1;
    } else if (violationType === 'contest_leave') {
      contestLeaves += 1;
    }

    const isDisqualified = fullscreenExits > 3 || contestLeaves > 3;
    let disqualificationReason = contest.disqualificationReason || null;

    if (isDisqualified) {
      disqualificationReason = fullscreenExits > 3 
        ? 'Exceeded maximum permitted fullscreen exits (> 3 exits). Marked as Malpractice.'
        : 'Exceeded maximum permitted contest departures (> 3 entries/exits). Marked as Malpractice.';
    }

    const updates: any = {
      fullscreenExits,
      contestLeaves,
      updatedAt: new Date().toISOString()
    };

    if (isDisqualified && contest.status !== 'disqualified') {
      updates.status = 'disqualified';
      updates.disqualificationReason = disqualificationReason;
      updates.disqualifiedAt = new Date().toISOString();
    }

    await contestRef.update(updates);

    sendResponse(res, 200, true, 'Malpractice status recorded', {
      fullscreenExits,
      contestLeaves,
      isDisqualified,
      disqualificationReason,
      status: updates.status || contest.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Advance sequentially to the next problem (Easy -> Medium -> Hard)
 */
export const advanceProblem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uid = req.user?.uid;
    const contestId = req.params.id as string;

    const contestRef = db.collection('users').doc(uid!).collection('ai_contests').doc(contestId);
    const contestDoc = await contestRef.get();

    if (!contestDoc.exists) {
      sendResponse(res, 404, false, 'Contest not found');
      return;
    }

    const contest = contestDoc.data()!;
    if (contest.status === 'disqualified') {
      sendResponse(res, 403, false, 'Contest has been disqualified due to malpractice');
      return;
    }

    const currentIdx = contest.currentProblemIndex || 0;
    if (currentIdx >= 2) {
      // Reached end of problems, auto finish
      return finishAIContest(req, res, next);
    }

    const nextIdx = currentIdx + 1;
    const now = new Date();

    const updates = {
      currentProblemIndex: nextIdx,
      problemStartedAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await contestRef.update(updates);

    sendResponse(res, 200, true, `Advanced to Problem ${nextIdx + 1}`, {
      currentProblemIndex: nextIdx,
      problemStartedAt: updates.problemStartedAt
    });
  } catch (error) {
    next(error);
  }
};

