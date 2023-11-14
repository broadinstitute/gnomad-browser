import { promises as fs } from 'fs';

export async function writeJsonToFile(obj: any, path: string): Promise<void> {
  try {
    const jsonString = JSON.stringify(obj);
    await fs.writeFile(path, jsonString, 'utf8');
    console.log('JSON written to file successfully.');
  } catch (err) {
    console.error('Error writing JSON to file:', err);
  }
}

export async function readJsonFromFile<T>(path: string): Promise<T> {
  try {
    const data = await fs.readFile(path, 'utf8');
    return JSON.parse(data) as T;
  } catch (err) {
    console.error('Error reading JSON from file:', err);
    throw err;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    return false;
  }
}

export const CACHE_PATH = process.env.JSON_CACHE_PATH

export const cacheVariantsByGeneFilePath = (gene_id: string) => `${CACHE_PATH}/variants_${gene_id}.json`

export class JsonCache<T> {
  async set(key: string, value: T): Promise<void> {
    await writeJsonToFile(value, cacheVariantsByGeneFilePath(key))
  }

  async get(key: string): Promise<T | undefined> {
    return await readJsonFromFile(cacheVariantsByGeneFilePath(key))
  }

  async exists(key: string): Promise<boolean> {
    return await fileExists(cacheVariantsByGeneFilePath(key))
  }
}

