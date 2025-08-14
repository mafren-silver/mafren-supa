import { NextRequest, NextResponse } from "next/server";
import { getBucket } from "@/lib/firebaseAdmin";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return new NextResponse("Thiếu file", { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const bucket = getBucket();
  const filename = `chat/${Date.now()}_${file.name}`;
  const token = uuidv4();

  const upload = bucket.file(filename);
  await upload.save(buffer, {
    contentType: file.type || "application/octet-stream",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    public: false,
    resumable: false,
  });

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://firebasestorage.googleapis.com/v0/b/${projectId}.appspot.com/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
  return NextResponse.json({ url, contentType: file.type, name: file.name });
}


