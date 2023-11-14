import { promises as fs } from 'fs';
import path from 'path'

import config from '../../config'


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
export class JsonCache<T> {

  filePathFromCacheKey(key: string): string {
    const fileName = key.replace(/:/g, "-") + ".json"
    return path.join(config.JSON_CACHE_PATH, fileName)
  }

  async set(key: string, value: T): Promise<void> {
    await writeJsonToFile(value, this.filePathFromCacheKey(key))
  }

  async get(key: string): Promise<T | undefined> {
    return await readJsonFromFile(this.filePathFromCacheKey(key))
  }

  async exists(key: string): Promise<boolean> {
    return await fileExists(this.filePathFromCacheKey(key))
  }
}

