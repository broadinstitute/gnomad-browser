import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const API_URL = 'http://localhost:8010/api';
const QUERIES_DIR = path.join(__dirname, 'queries');
const SNAPSHOTS_DIR = path.join(__dirname, 'snapshots');

// Recursive key sorting function for deterministic snapshots
const sortObjectKeys = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: { [key: string]: any } = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key]);
  }
  return result;
};

// Helper to execute a query
async function executeQuery(query: string, variables: Record<string, any>) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

// Main function to read queries and generate snapshots
async function main() {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });

  const queryFiles = await fs.readdir(QUERIES_DIR);

  for (const file of queryFiles) {
    if (file.endsWith('.graphql')) {
      console.log(`Generating snapshot for ${file}...`);
      const queryContent = await fs.readFile(path.join(QUERIES_DIR, file), 'utf-8');
      const variablesFile = file.replace('.graphql', '.json');
      let variables = {};
      try {
        const variablesContent = await fs.readFile(path.join(QUERIES_DIR, variablesFile), 'utf-8');
        variables = JSON.parse(variablesContent);
      } catch (e) {
        // No variables file, which is fine
      }

      try {
        const result = await executeQuery(queryContent, variables);
        const snapshotPath = path.join(SNAPSHOTS_DIR, file.replace('.graphql', '.snapshot.json'));
        // Sort keys recursively for consistent diffs
        const sortedResult = sortObjectKeys(result);
        await fs.writeFile(snapshotPath, JSON.stringify(sortedResult, null, 2));
        console.log(`  -> Snapshot saved to ${snapshotPath}`);
      } catch (error) {
        console.error(`  -> Failed to generate snapshot for ${file}:`, error);
      }
    }
  }
}

main();