/** Haptic cues. On iOS they go through Capacitor's native haptics; on the web, browsers that support vibration get a short tap and the rest stay silent. */
export type Haptic = 'select' | 'tap' | 'unit' | 'success' | 'error';

const native = process.env.NEXT_PUBLIC_BUILD_TARGET === 'ios' ? import('@capacitor/haptics') : null;
// One selection generator for the whole session, so ticks in quick succession never end each other's.
let selection: Promise<void> | null = null;

export function haptic(kind: Haptic) {
  if (!native) {
    if (kind === 'tap' || kind === 'unit' || kind === 'success') try { navigator.vibrate?.(8); } catch { /* Haptics are optional. */ }
    return;
  }
  native.then(async ({ Haptics, ImpactStyle, NotificationType }) => {
    if (kind === 'select') { selection ??= Haptics.selectionStart(); await selection; await Haptics.selectionChanged(); }
    else if (kind === 'tap') await Haptics.impact({ style: ImpactStyle.Light });
    else if (kind === 'unit') await Haptics.impact({ style: ImpactStyle.Medium });
    else await Haptics.notification({ type: kind === 'success' ? NotificationType.Success : NotificationType.Error });
  }).catch(() => { /* Haptics are optional. */ });
}
