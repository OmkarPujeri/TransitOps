import { createHmac } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, dirname } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

export function hmacSign(path: string, expiresAt: number): string {
  const secret = process.env.JWT_SECRET || "dev";
  return createHmac("sha256", secret)
    .update(`${path}:${expiresAt}`)
    .digest("hex");
}

export function hmacVerify(
  path: string,
  token: string,
  expiresAt: number
): boolean {
  if (Date.now() / 1000 > expiresAt) return false;
  return token === hmacSign(path, expiresAt);
}

export function createStorageAdapter(bucket: string) {
  const base = join(UPLOAD_DIR, bucket);

  return {
    async upload(
      storagePath: string,
      file: File | Buffer,
      _opts?: { contentType?: string; upsert?: boolean }
    ): Promise<{ error: { message: string } | null }> {
      try {
        const dest = join(base, storagePath);
        await mkdir(dirname(dest), { recursive: true });
        const buffer =
          file instanceof File
            ? Buffer.from(await file.arrayBuffer())
            : file;
        await writeFile(dest, buffer);
        return { error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: { message: msg } };
      }
    },

    async remove(
      paths: string[]
    ): Promise<{ error: { message: string } | null }> {
      try {
        for (const p of paths) {
          await unlink(join(base, p)).catch(() => {});
        }
        return { error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { error: { message: msg } };
      }
    },

    async createSignedUrl(
      storagePath: string,
      expiresInSeconds: number
    ): Promise<
      | { data: { signedUrl: string }; error: null }
      | { data: null; error: { message: string } }
    > {
      try {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
        const fullPath = `${bucket}/${storagePath}`;
        const token = hmacSign(fullPath, expiresAt);
        const url = `/api/files/${fullPath}?token=${token}&expires=${expiresAt}`;
        return { data: { signedUrl: url }, error: null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { data: null, error: { message: msg } };
      }
    },
  };
}
