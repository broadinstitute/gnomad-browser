import { promises as fs } from 'fs';
import { join, dirname } from 'path'
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

import { Storage, Bucket } from '@google-cloud/storage'

import logger from '../../logger'

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

async function createDirectoryIfNotExists(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function writeJsonToFile(obj: any, path: string, useCompression = false): Promise<void> {
  try {
    createDirectoryIfNotExists(dirname(path))
    const jsonString = JSON.stringify(obj);

    if (useCompression) {
      const compressedData = await gzipAsync(jsonString)
      await fs.writeFile(path, compressedData)
    } else {
      await fs.writeFile(path, jsonString, 'utf8');
    }
  } catch (err) {
    logger.warn(`Error writing JSON to file: ${err}`);
    throw err;
  }
}

export async function readJsonFromFile<T>(path: string, useCompression = false): Promise<T> {
  try {
    if (useCompression) {
      const data = await fs.readFile(path);
      const decompressedContents = await gunzipAsync(data);
      return JSON.parse(decompressedContents.toString('utf8')) as T
    }
    const data = await fs.readFile(path, "utf8");
    return JSON.parse(data) as T;
  } catch (err) {
    logger.warn(`Error reading JSON to file: ${err}`);
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


export async function writeJsonToFileGcs(obj: any, bucket: Bucket, path: string, useCompression = false): Promise<void> {

  const file = bucket.file(path)
  const data = JSON.stringify(obj)

  if (useCompression) {
    const compressedData = await gzipAsync(data);
    await file.save(compressedData)
  } else {
    await file.save(data)
  }
}

export async function readJsonFromFileGcs<T>(path: string, bucket: Bucket, useCompression = false): Promise<T> {
  const file = bucket.file(path)
  const [maybeCompressedContents] = await file.download()
  if (useCompression) {
    const contents = await gunzipAsync(maybeCompressedContents);
    return JSON.parse(contents.toString('utf-8'))
  }
  return JSON.parse(maybeCompressedContents.toString('utf-8'))
}

async function fileExistsGcs(path: string, bucket: Bucket): Promise<boolean> {
  const file = bucket.file(path)
  const [exists] = await file.exists()
  logger.info(`Key ${path} exists in cache`)
  return exists
}

function extractBucketName(gcsPath: string): string | null {
  const regex = /^gs:\/\/([^/]+)\/?.*$/;
  const match = gcsPath.match(regex);

  if (match && match[1]) {
    return match[1];
  }
  return null
}

function extractGcsPath(gcsUrl: string): string | null {
  const regex = /^gs:\/\/[^/]+\/(.+)$/;
  const match = gcsUrl.match(regex);

  if (match && match[1]) {
    return match[1];
  }
  return null
}

export class JsonCache<T> {
  // If gs:// in the path, will use GCS. If not, use local directory.
  private json_cache_path: string

  private bucketName: string | null

  private bucket?: Bucket

  private useCompression = false

  filePathFromCacheKey(key: string): string {
    const gzipExt = this.useCompression ? ".gz" : ""
    const fileName = `${key.replace(/:/g, "-")}.json${gzipExt}`
    return join(this.json_cache_path, fileName)
  }

  constructor(json_cache_path: string, compression = false) {
    this.json_cache_path = json_cache_path

    this.bucketName = extractBucketName(json_cache_path)

    this.useCompression = compression

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
  }

  async set(key: string, value: T): Promise<void> {
    logger.info(`Cache insert ${key}`);
    const filePath = this.filePathFromCacheKey(key)

    if (this.bucket) {
      await writeJsonToFileGcs(value, this.bucket, filePath, this.useCompression)

    } else {
      await writeJsonToFile(value, filePath, this.useCompression)
    }
  }

  async get(key: string): Promise<T | undefined> {
    logger.info(`Cache hit ${key}`)
    const filePath = this.filePathFromCacheKey(key)
    if (this.bucket) {
      return readJsonFromFileGcs(filePath, this.bucket, this.useCompression)

    }

    return readJsonFromFile(filePath, this.useCompression)
  }

  async exists(key: string): Promise<boolean> {

    const filePath = this.filePathFromCacheKey(key)

    if (this.bucket) {
      return fileExistsGcs(filePath, this.bucket)
    }

    return fileExists(filePath)
  }
}

