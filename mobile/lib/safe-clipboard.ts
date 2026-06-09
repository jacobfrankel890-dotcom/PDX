import { requireOptionalNativeModule } from "expo-modules-core";

type ClipboardNative = {
  setStringAsync(value: string): Promise<void>;
  getStringAsync(): Promise<string>;
};

function getClipboardNative(): ClipboardNative | null {
  return requireOptionalNativeModule<ClipboardNative>("ExpoClipboard");
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  const clipboard = getClipboardNative();
  if (!clipboard?.setStringAsync) return false;
  try {
    await clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
