import { calculateProgressFromMilestones, DEFAULT_LIFECYCLE_STAGES } from './src/controllers/project.controller';
import { gitAnalyzer } from './src/services/gitAnalyzer.service';
import { projectVerificationService } from './src/services/projectVerification.service';

async function runPhase6Tests() {
  console.log('=== RUNNING PHASE 6 VERIFICATION TEST SUITE ===\n');

  // Test 1: Strict Milestone Progress Calculation
  console.log('Test 1: Milestone Progress Calculation (Never manually entered)...');
  const sample10Milestones = Array.from({ length: 10 }, (_, i) => ({
    id: `m_${i}`,
    title: `Milestone ${i + 1}`,
    lifecycleStage: 'Custom',
    completed: i < 6, // 6 completed
    tasks: []
  }));

  const progress6of10 = calculateProgressFromMilestones(sample10Milestones);
  console.log(`- 6 of 10 completed: Expected 60%, Got: ${progress6of10}%`);
  if (progress6of10 !== 60) throw new Error(`Expected 60% for 6/10, got ${progress6of10}%`);

  // Now complete 8 of 10
  sample10Milestones[6].completed = true;
  sample10Milestones[7].completed = true;
  const progress8of10 = calculateProgressFromMilestones(sample10Milestones);
  console.log(`- 8 of 10 completed: Expected 80%, Got: ${progress8of10}%`);
  if (progress8of10 !== 80) throw new Error(`Expected 80% for 8/10, got ${progress8of10}%`);
  console.log('✓ Test 1 Passed: Automatic milestone-based progress calculation verified.\n');

  // Test 2: Standard 11 Lifecycle Stages
  console.log('Test 2: Verifying Standard 11 Lifecycle Stages...');
  console.log(`- Default lifecycle stages count: ${DEFAULT_LIFECYCLE_STAGES.length}`);
  const expectedStages = [
    'Idea', 'Architecture', 'Database', 'Backend', 'Frontend',
    'Authentication', 'Testing', 'Docker', 'Deployment', 'Documentation', 'Resume Readiness'
  ];
  for (const st of expectedStages) {
    const found = DEFAULT_LIFECYCLE_STAGES.some(s => s.lifecycleStage === st);
    if (!found) throw new Error(`Missing expected stage: ${st}`);
  }
  console.log('✓ Test 2 Passed: All 11 lifecycle stages present.\n');

  // Test 3: GitHub URL Parsing
  console.log('Test 3: GitHub URL Parsing & Extraction...');
  const parsed1 = gitAnalyzer.parseGitHubUrl('https://github.com/facebook/react.git');
  console.log('- Parsed URL:', parsed1);
  if (!parsed1 || parsed1.owner !== 'facebook' || parsed1.repo !== 'react') {
    throw new Error('GitHub URL parsing failed for standard URL');
  }
  const parsed2 = gitAnalyzer.parseGitHubUrl('vercel/next.js');
  if (!parsed2 || parsed2.owner !== 'vercel' || parsed2.repo !== 'next.js') {
    throw new Error('GitHub URL parsing failed for short URL');
  }
  console.log('✓ Test 3 Passed: GitHub URL parsing verified.\n');

  // Test 4: Project Verification Report & Mismatch Detection
  console.log('Test 4: Project Verification & Mismatch Engine...');
  const mockEvidence: any = {
    repoName: 'placement-os',
    owner: 'user',
    totalCommits: 14,
    totalFiles: 28,
    totalLinesOfCode: 3400,
    languagesDetected: { TypeScript: 24, JSON: 4 },
    commits: [
      { sha: 'abc1234', author: 'Dev', date: new Date().toISOString(), message: 'Initial architecture setup', filesChanged: ['src/app.ts'], qualityRating: 'good' },
      { sha: 'def5678', author: 'Dev', date: new Date().toISOString(), message: 'update', filesChanged: ['README.md'], qualityRating: 'low_effort', discrepancyNote: 'Vague message' }
    ],
    cadence: {
      firstCommitDate: '2026-09-01T00:00:00.000Z',
      lastCommitDate: '2026-10-08T00:00:00.000Z',
      spanDays: 37,
      commitFrequencyDescription: '14 commits over 37 day(s)',
      singleCommitDumpDetected: false
    },
    commitMetrics: {
      meaningfulCommitRatio: 75,
      commitMessageQualityScore: 82,
      commitVsCodeConsistencyScore: 88,
      genuineIncrementalDevelopment: true,
      analysisNotes: 'Genuine incremental development across 14 commits.'
    },
    projectStructure: {
      hasBackendFolder: true,
      hasFrontendFolder: true,
      isMonorepo: true,
      hasTests: true,
      hasDocker: false,
      hasCiCd: false,
      topLevelFolders: ['backend', 'frontend']
    },
    detectedTechnologies: ['TypeScript', 'Express.js', 'Next.js', 'TailwindCSS'],
    dependenciesDetected: {
      frameworks: ['Express.js', 'Next.js'],
      databases: ['Firebase Firestore'],
      authMechanisms: ['Firebase Auth'],
      testingFrameworks: ['Jest'],
      libraries: ['Axios', 'TailwindCSS'],
      devOps: []
    },
    securityFindings: [],
    secretFindings: [],
    documentation: {
      hasReadme: true,
      readmeContentPreview: '# PlacementOS',
      readmeWordCount: 450,
      architectureDiagramFound: true,
      setupInstructionsFound: true,
      apiDocumentationFound: true
    },
    liveUrlCheck: { checked: false, isReachable: false },
    featureEvidence: {
      'Contest Arena': { detected: true, evidenceSnippet: 'Found in src/controllers/contest.controller.ts' }
    }
  };

  const projectInput = {
    id: 'test_proj_1',
    name: 'PlacementOS Platform',
    description: 'An AI-powered placement preparation operating system',
    technologies: ['TypeScript', 'Express.js', 'Next.js', 'Kubernetes'], // Note: Kubernetes is undeclared in repo!
    features: ['Contest Arena', 'Blockchain Payment Gateway'], // Blockchain is missing!
    githubUrl: 'https://github.com/user/placement-os'
  };

  const report = await projectVerificationService.generateReadinessReport(projectInput, mockEvidence);
  console.log(`- Provider Used: ${report.providerUsed}`);
  console.log(`- Overall Readiness Score: ${report.readinessScores.overall}/100`);
  console.log(`- Verified Techs: ${report.techVerification.verifiedTechs.join(', ')}`);
  console.log(`- Flagged Missing Techs: ${report.techVerification.missingOrUnverifiedTechs.join(', ')}`);
  console.log(`- Flagged Missing Features: ${report.featureVerification.unverifiedFeatures.join(', ')}`);
  console.log(`- Interview Questions Count: ${report.interviewQuestions.length}`);

  if (!report.techVerification.missingOrUnverifiedTechs.includes('Kubernetes')) {
    throw new Error('Expected Kubernetes to be flagged as missing/unverified');
  }
  if (!report.featureVerification.unverifiedFeatures.includes('Blockchain Payment Gateway')) {
    throw new Error('Expected Blockchain Payment Gateway to be flagged as unverified');
  }
  if (report.interviewQuestions.length < 3) {
    throw new Error('Expected at least 3 interview questions');
  }
  console.log('✓ Test 4 Passed: Verification and mismatch detection engine verified.\n');

  // Test 5: Interview Practice Answer Evaluation
  console.log('Test 5: Interview Practice Evaluation...');
  const firstQ = report.interviewQuestions[0];
  const sampleAnswer = 'We implemented a controller and service layer pattern to separate HTTP parsing from business logic and database access, ensuring single responsibility.';
  const evalResult = await projectVerificationService.evaluateInterviewAnswer(
    firstQ,
    sampleAnswer,
    { name: projectInput.name, technologies: projectInput.technologies }
  );
  console.log(`- Answer Score: ${evalResult.score}/100`);
  console.log(`- Depth Rating: ${evalResult.feedback.technicalDepth}`);
  console.log(`- Strengths: ${evalResult.feedback.strengths.join(', ')}`);
  if (!evalResult.score || evalResult.score <= 0) {
    throw new Error('Interview evaluation score missing');
  }
  console.log('✓ Test 5 Passed: Interview evaluation and feedback working cleanly.\n');

  console.log('🎉 ALL PHASE 6 TESTS PASSED SUCCESSFULLY!');
}

runPhase6Tests().catch(err => {
  console.error('❌ Phase 6 Test Failed:', err);
  process.exit(1);
});
