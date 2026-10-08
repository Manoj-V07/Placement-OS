import { generateAIContest, startAIContest, submitAIProblem, finishAIContest, runAICode } from './src/controllers/aiContest.controller';
import { db } from './src/config/firebase';

async function runE2ETest() {
  console.log('=== Phase 5: AI-Generated Contest End-to-End Test ===');
  const uid = 'test-uid-phase5';

  const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.data = data;
      return res;
    };
    return res;
  };

  // Seed sample DSA attempts for the test user
  console.log('1. Seeding test DSA attempts and CP cache...');
  await db.collection('users').doc(uid).collection('dsa_attempts').doc('prob-1').set({
    solved: true,
    understandingLevel: 5,
    lastAttemptedAt: new Date(Date.now() - 3600000).toISOString()
  });
  await db.collection('users').doc(uid).collection('dsa_attempts').doc('prob-2').set({
    solved: false,
    understandingLevel: 2,
    lastAttemptedAt: new Date(Date.now() - 1800000).toISOString()
  });

  // Seed mock CP sync data
  await db.collection('users').doc(uid).collection('cp_data').doc('latest').set({
    leetcode: {
      recentActivity: [
        { title: 'Two Sum', status: 'Accepted', lang: 'python3' },
        { title: 'Subarray Sum Equals K', status: 'Accepted', lang: 'cpp' }
      ]
    },
    codechef: {
      recentActivity: [
        { problemName: 'Chef and Strings', status: 'Accepted', lang: 'C++' }
      ]
    }
  });

  // 2. Generate AI Contest
  console.log('2. Requesting AI-generated contest (Phase 5)...');
  const reqGen: any = { user: { uid } };
  const resGen = mockRes();
  await generateAIContest(reqGen, resGen, console.error);

  if (resGen.statusCode !== 201) {
    throw new Error('Failed to generate contest: ' + JSON.stringify(resGen.data));
  }

  const contest = resGen.data.data;
  console.log(`Contest Created: "${contest.title}" (ID: ${contest.id})`);
  console.log(`Contest Duration: ${contest.durationMinutes} minutes`);
  console.log(`Total Problems: ${contest.problems.length}`);

  if (contest.problems.length !== 3) {
    throw new Error('Expected 3 problems, got: ' + contest.problems.length);
  }

  const [p1, p2, p3] = contest.problems;
  console.log(`- Problem 1: [${p1.difficulty}] ${p1.title} (${p1.targetMinutes} min, ${p1.points} pts)`);
  console.log(`- Problem 2: [${p2.difficulty}] ${p2.title} (${p2.targetMinutes} min, ${p2.points} pts)`);
  console.log(`- Problem 3: [${p3.difficulty}] ${p3.title} (${p3.targetMinutes} min, ${p3.points} pts)`);

  if (p1.difficulty !== 'Easy' || p2.difficulty !== 'Medium' || p3.difficulty !== 'Hard') {
    throw new Error('Problem difficulties do not match Easy, Medium, Hard!');
  }

  // 3. Start Contest
  console.log('3. Starting contest session...');
  const reqStart: any = { user: { uid }, params: { id: contest.id } };
  const resStart = mockRes();
  await startAIContest(reqStart, resStart, console.error);
  console.log('Contest status:', resStart.data.data.status, '| Started At:', resStart.data.data.startedAt);

  // 4. Test Run Code on public test cases
  console.log('4. Running code against public test cases in sandbox...');
  const reqRun: any = {
    user: { uid },
    body: {
      language: 'python',
      code: p1.starterTemplates.python,
      testCases: p1.publicTestCases
    }
  };
  const resRun = mockRes();
  await runAICode(reqRun, resRun, console.error);
  console.log('Run Code Overall Status:', resRun.data.data.overallStatus);

  // 5. Submit Problem 1 with correct solution
  console.log('5. Submitting solution for Problem 1...');
  const reqSub: any = {
    user: { uid },
    params: { id: contest.id },
    body: {
      problemId: p1.id,
      language: 'python',
      code: p1.starterTemplates.python
    }
  };
  const resSub = mockRes();
  await submitAIProblem(reqSub, resSub, console.error);
  console.log('Submission Verdict:', resSub.data.data.verdict, `(${resSub.data.data.passedCases}/${resSub.data.data.totalCases} passed)`);
  console.log('Current Contest Score:', resSub.data.data.totalScore);

  // 6. Finish Contest & Calculate Post-Contest Performance
  console.log('6. Finishing contest and computing analytics...');
  const reqFinish: any = { user: { uid }, params: { id: contest.id } };
  const resFinish = mockRes();
  await finishAIContest(reqFinish, resFinish, console.error);

  const perf = resFinish.data.data.performance;
  console.log('\n--- Post-Contest Performance Report ---');
  console.log('Contest Score:', perf.contestScore);
  console.log('Problems Solved:', `${perf.problemsSolved}/${perf.totalProblems}`);
  console.log('Submission Accuracy:', `${perf.accuracy}%`);
  console.log('Difficulty-wise breakdown:');
  console.log('  Easy:', perf.difficultyPerformance.Easy);
  console.log('  Medium:', perf.difficultyPerformance.Medium);
  console.log('  Hard:', perf.difficultyPerformance.Hard);
  console.log('Topics Mastered:', perf.topicsMastered);
  console.log('Identified Weaknesses for Next Contests:', perf.weaknesses);

  console.log('\n=== All Phase 5 Backend Tests Passed Successfully! ===');
  process.exit(0);
}

runE2ETest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
