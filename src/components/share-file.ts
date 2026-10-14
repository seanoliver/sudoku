export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

const ios = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios';
const nativeShare = ios ? Promise.all([import('@capacitor/share'), import('@capacitor/filesystem')]) : null;

const base64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
export const isCancel = (error: unknown) => error instanceof DOMException ? error.name === 'AbortError' : /cancel/i.test(String((error as Error)?.message ?? error));

export async function shareFile(file: File): Promise<ShareOutcome> {
  if (nativeShare) {
    try {
      const [{ Share }, { Filesystem, Directory }] = await nativeShare;
      const { uri } = await Filesystem.writeFile({ path: file.name, data: await base64(file), directory: Directory.Cache });
      await Share.share({ files: [uri] });
      return 'shared';
    } catch (error) {
      if (isCancel(error)) return 'cancelled';
      throw error;
    }
  }
  // No `await` before `navigator.share`: Safari rejects a share that starts after the tap.
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; } catch (error) { if (isCancel(error) || (error instanceof DOMException && error.name === 'InvalidStateError')) return 'cancelled'; }
  }
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return 'saved';
}
