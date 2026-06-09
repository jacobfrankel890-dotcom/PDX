import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

type UploadReceiptParams = {
  reportId: string;
  uri: string;
  mimeType: string;
  fileName: string;
  userId?: string;
};

function extensionForMime(mimeType: string, fileName: string): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export async function uploadReceiptToStorage({
  userId,
  reportId,
  uri,
  mimeType,
  fileName,
}: UploadReceiptParams): Promise<string> {
  let ownerId = userId;
  if (!ownerId) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not signed in");
    ownerId = user.id;
  }

  const ext = extensionForMime(mimeType, fileName);
  const storagePath = `${ownerId}/${reportId}/${Date.now()}.${ext}`;

  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read receipt image");

  const arrayBuffer = await response.arrayBuffer();
  if (!arrayBuffer.byteLength) throw new Error("Receipt image is empty");

  const contentType =
    mimeType.startsWith("image/") && !mimeType.includes("heic") && !mimeType.includes("heif")
      ? mimeType
      : "image/jpeg";

  const { error } = await supabase.storage.from("receipts").upload(storagePath, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    if (error.message.toLowerCase().includes("bucket")) {
      throw new Error("Receipt storage is not set up yet. Contact support.");
    }
    throw new Error(error.message);
  }

  return storagePath;
}

export const RECEIPT_IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  quality: 0.7,
  base64: false,
  ...(ImagePicker.PreferredAssetRepresentationMode
    ? { preferredAssetRepresentationMode: ImagePicker.PreferredAssetRepresentationMode.Compatible }
    : {}),
};
