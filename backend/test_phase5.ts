import { createContest, addMistake } from './src/controllers/contest.controller';
import { db } from './src/config/firebase';

async function runTest() {
  console.log("Running E2E Test for Phase 5...");

  const uid = "test-uid-123";
  // Mock req and res
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

  console.log("1. Creating fake LeetCode contest...");
  const req1: any = {
    user: { uid },
    body: {
      platform: "LeetCode",
      contestDate: "2026-10-07",
      problemsAttempted: 4,
      problemsSolved: 3,
      rank: 1200,
      ratingBefore: 1800,
      ratingAfter: 1820,
      notes: "Failed one graph problem."
    }
  };
  const res1 = mockRes();
  await createContest(req1, res1, console.error);

  if (res1.statusCode !== 201) {
    throw new Error("Failed to create contest: " + JSON.stringify(res1.data));
  }
  const contestId = res1.data.data.id;
  console.log("Contest created. ID:", contestId);
  console.log("Contest Stats:", res1.data.data.problemsAttempted, "attempted,", res1.data.data.problemsSolved, "solved.");

  console.log("2. Associating failed problem with a weak topic...");
  const req2: any = {
    user: { uid },
    params: { id: contestId },
    body: {
      problemName: "Graph Valid Tree",
      topic: "Graph",
      description: "Missed the cycle detection logic."
    }
  };
  const res2 = mockRes();
  await addMistake(req2, res2, console.error);

  if (res2.statusCode !== 201) {
    throw new Error("Failed to add mistake: " + JSON.stringify(res2.data));
  }
  console.log("Mistake added.");
  console.log("Generated Revision Task:", res2.data.data.task.title);

  // Verify in DB
  const tasksSnapshot = await db.collection('users').doc(uid).collection('tasks').get();
  const revisionTasks = tasksSnapshot.docs.map(d => d.data()).filter(t => t.category === "Revision" && t.title.includes("Graph Valid Tree"));
  if (revisionTasks.length > 0) {
    console.log("SUCCESS: Revision task successfully appeared in analytics/tasks!");
  } else {
    console.log("FAILED: Revision task not found in database.");
  }

  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
