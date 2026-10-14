/** How a share ended: sent through the share sheet, saved because this browser cannot share files, or dismissed. */
export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

const ios = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios';
const nativeShare = ios ? Promise.all([import('@capacitor/share'), import('@capacitor/filesystem')]) : null;

const base64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const isCancel = (error: unknown) => error instanceof DOMException ? error.name === 'AbortError' : /cancel/i.test(String((error as Error)?.message ?? error));

/**
 * Sends an image through the share sheet. The iOS app writes it to its cache folder and uses the native sheet. The
 * website uses the Web Share API, which must run during the tap, so the file has to exist before it; a browser that
 * cannot share files saves the image instead.
 */
export async function shareFile(file: File): Promise<ShareOutcome> {
  try {
    if (nativeShare) {
      const [{ Share }, { Filesystem, Directory }] = await nativeShare;
      const { uri } = await Filesystem.writeFile({ path: file.name, data: await base64(file), directory: Directory.Cache });
      await Share.share({ files: [uri] });
      return 'shared';
    }
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
  } catch (error) {
    if (isCancel(error)) return 'cancelled';
    throw error;
  }
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return 'saved';
}
