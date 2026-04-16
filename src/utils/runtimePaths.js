import path from 'path';
import { tmpdir } from 'os';

export function resolveWritableDataPath(filename, repoRelativePath) {
  if (process.env.VERCEL) {
    return path.join(tmpdir(), filename);
  }

  return repoRelativePath;
}
