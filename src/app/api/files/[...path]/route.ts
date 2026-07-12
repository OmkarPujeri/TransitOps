import { NextResponse, type NextRequest } from "next/server";
import { hmacVerify } from "@/lib/storage";
import { readFile } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const filePath = segments.join("/");

  const token = req.nextUrl.searchParams.get("token");
  const expires = Number(req.nextUrl.searchParams.get("expires"));

  if (!token || !expires || !hmacVerify(filePath, token, expires)) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 403 }
    );
  }

  try {
    const absPath = join(UPLOAD_DIR, filePath);
    // Prevent path traversal
    if (!absPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    }

    const data = await readFile(absPath);
    const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";
    const filename = filePath.split("/").pop() ?? "download";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
