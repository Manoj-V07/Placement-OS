import { connectProfiles, getCPStats, syncCPStats, getComparison } from './src/controllers/cp.controller';
import { db } from './src/config/firebase';

async function runCPTest() {
  console.log("=== Running Phase 5 CP Integration End-to-End Test ===");
  const uid = "test-uid-phase5-cp";

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

  // 1. Connect real public profiles
  console.log("\n1. Testing profile connection with public handles...");
  const connectReq: any = {
    user: { uid },
    body: {
      leetcodeUsername: "neal_wu",
      codechefUsername: "tourist"
    }
  };
  const connectRes = mockRes();
  await connectProfiles(connectReq, connectRes, (err: any) => console.error("Error in connect:", err));

  console.log("Connect response status:", connectRes.statusCode);
  const connectedData = connectRes.data?.data;
  console.log("LeetCode available:", connectedData?.leetcode?.available);
  console.log("LeetCode total solved:", connectedData?.leetcode?.totalSolved);
  console.log("LeetCode rating:", connectedData?.leetcode?.contestRating);
  console.log("LeetCode contests:", connectedData?.leetcode?.contestsParticipated);
  console.log("CodeChef available:", connectedData?.codechef?.available);
  console.log("CodeChef rating:", connectedData?.codechef?.rating);
  console.log("CodeChef total solved:", connectedData?.codechef?.totalSolved);
  console.log("CodeChef contests:", connectedData?.codechef?.contestsParticipated);

  if (connectRes.statusCode !== 200 || !connectedData?.leetcode?.available) {
    throw new Error("Failed to connect & fetch LeetCode profile!");
  }

  // 2. Test getCPStats (cached retrieval)
  console.log("\n2. Testing getCPStats (retrieving stats)...");
  const statsReq: any = { user: { uid } };
  const statsRes = mockRes();
  await getCPStats(statsReq, statsRes, console.error);
  console.log("getCPStats status:", statsRes.statusCode);
  console.log("Retrieved cached sync time:", statsRes.data?.data?.lastSyncedAt);

  // 3. Test force sync
  console.log("\n3. Testing syncCPStats (force synchronization)...");
  const syncReq: any = { user: { uid } };
  const syncRes = mockRes();
  await syncCPStats(syncReq, syncRes, console.error);
  console.log("syncCPStats status:", syncRes.statusCode);
  console.log("Synced at:", syncRes.data?.data?.lastSyncedAt);

  // 4. Test unavailable state for non-existent profile (No fake data!)
  console.log("\n4. Testing unavailable state for invalid username (ensuring no fabricated data)...");
  const invalidConnectReq: any = {
    user: { uid },
    body: {
      leetcodeUsername: "this_user_definitely_does_not_exist_9817234",
      codechefUsername: "this_user_definitely_does_not_exist_9817234"
    }
  };
  const invalidRes = mockRes();
  await connectProfiles(invalidConnectReq, invalidRes, console.error);
  console.log("Invalid profiles connected.");
  const invalidData = invalidRes.data?.data;
  console.log("LeetCode available state:", invalidData?.leetcode?.available, "| Error:", invalidData?.leetcode?.error);
  console.log("CodeChef available state:", invalidData?.codechef?.available, "| Error:", invalidData?.codechef?.error);
  if (invalidData?.leetcode?.available === true || invalidData?.codechef?.available === true) {
    throw new Error("Fabricated data detected! Invalid accounts should return available: false");
  }

  // Restore valid handles for comparison testing
  await connectProfiles(connectReq, connectRes, console.error);

  // 5. Test Comparison API (Planned DSA progress vs Actual CP performance)
  console.log("\n5. Testing getComparison API...");
  const compReq: any = { user: { uid } };
  const compRes = mockRes();
  await getComparison(compReq, compRes, console.error);
  console.log("Comparison status:", compRes.statusCode);
  const comparison = compRes.data?.data;
  console.log("Planned DSA summary:", comparison?.plannedDSA);
  console.log("Actual CP summary:", comparison?.actualCP);
  console.log("Insights summary:", comparison?.insights?.summary);

  console.log("\n=== Phase 5 Backend Tests Passed Successfully! ===");
  process.exit(0);
}

runCPTest().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
