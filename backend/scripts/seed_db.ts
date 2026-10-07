import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/config/firebase'; // Ensure this uses a service account or configured firebase-admin

async function seed() {
  const dataPath = path.join(__dirname, 'dsa_problems.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const problems = JSON.parse(rawData);

  console.log(`Starting to seed ${problems.length} problems...`);
  
  let i = 0;
  const batchSize = 100;
  let batch = db.batch();

  for (const problem of problems) {
    const docRef = db.collection('dsa_problems').doc();
    batch.set(docRef, {
      ...problem,
      createdAt: new Date().toISOString()
    });

    i++;
    if (i % batchSize === 0) {
      await batch.commit();
      console.log(`Seeded ${i} problems...`);
      batch = db.batch();
    }
  }

  if (i % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`Successfully seeded all ${problems.length} problems.`);
}

seed().catch(console.error);
