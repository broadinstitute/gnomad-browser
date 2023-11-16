import { promises as fs } from 'fs';
import { join } from 'path'

import { Storage, Bucket } from '@google-cloud/storage'

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

function extractBucketName(gcsPath: string): string | null {
  const regex = /^gs:\/\/([^\/]+)\/?.*$/;
  const match = gcsPath.match(regex);

  if (match && match[1]) {
    return match[1];
  }
  return null
}

function extractGcsPath(gcsUrl: string): string | null {
  const regex = /^gs:\/\/[^\/]+\/(.+)$/;
  const match = gcsUrl.match(regex);

  if (match && match[1]) {
    return match[1];
  }
  return null
}

export class JsonCache<T> {
  private json_cache_path: string
  private bucketName: string | null
  private bucket?: Bucket

  filePathFromCacheKey(key: string): string {
    const fileName = `${key.replace(/:/g, "-")}.json`
    return join(this.json_cache_path, fileName)
  }

  constructor(json_cache_path: string) {
    this.json_cache_path = json_cache_path

    this.bucketName = extractBucketName(json_cache_path)

    if (this.bucketName) {
      const storage = new Storage();
      const bucket = storage.bucket(this.bucketName)

      const gcsPath = extractGcsPath(json_cache_path)

      if (!gcsPath) {
        throw new Error("Could not determine gcs path even though using bucket")
      } else {
        this.json_cache_path = gcsPath
      }

      if (bucket) {
        this.bucket = bucket
      }
    }

    console.log(`Storage bucket: ${this.bucketName}`)
  }

  async set(key: string, value: T): Promise<void> {
    const filePath = this.filePathFromCacheKey(key)

    if (this.bucket) {
      const file = this.bucket.file(filePath)
      await file.save(JSON.stringify(value))
    } else {
      await writeJsonToFile(value, filePath)
    }
  }

  async get(key: string): Promise<T | undefined> {
    console.log(`Getting ${key} from cache`)
    const filePath = this.filePathFromCacheKey(key)
    if (this.bucket) {
      try {
        const file = this.bucket.file(filePath)
        const [contents] = await file.download()
        return JSON.parse(contents.toString('utf-8'))
      } catch (error) {
        throw error
      }

    } else {
      return await readJsonFromFile(filePath)
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.filePathFromCacheKey(key)

    if (this.bucket) {
      const file = this.bucket.file(filePath)
      const [exists] = await file.exists()
      return exists
    } else {
      return await fileExists(filePath)
    }
  }
}

