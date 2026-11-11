/** Web build of the 3D viewer: the same page in an iframe. */
import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { color } from '@/theme';

import { thumb } from '../catalogue';
import { parseEvent, type ViewerCommand, type ViewerHandle, type ViewerProps } from './protocol';

export const Viewer = forwardRef<ViewerHandle, ViewerProps>(function Viewer({ id, personal, onActions, onLive }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let on = true, url = '';
    import('./viewerHtml').then((m) => {
      if (!on) return;
      url = URL.createObjectURL(new Blob([m.default], { type: 'text/html' }));
      setSrc(url);
    }).catch(() => onLive?.(false));
    return () => { on = false; if (url) URL.revokeObjectURL(url); };
  }, [onLive]);

  const send = useCallback((cmd: ViewerCommand) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify(cmd), '*');
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const m = parseEvent(e.data);
      if (!m) return;
      if (m.type === 'ready') setReady(true);
      else if (m.type === 'shown') { setLive(true); onLive?.(true); onActions?.(m.actions); }
      else if (m.type === 'actions') onActions?.(m.actions);
      else if (m.type === 'failed') { setLive(false); onLive?.(false); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onActions, onLive]);

  useEffect(() => { if (ready) send({ type: 'show', id, personal }); }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && live) send({ type: 'personal', personal }); }, [personal.name, personal.latin, personal.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ act: (actionId) => send({ type: 'action', id: actionId }) }), [send]);

  return (
    <View style={styles.box}>
      <Image source={thumb(id)} style={StyleSheet.absoluteFill} contentFit="cover" />
      {src ? (
        <iframe
          ref={frame}
          src={src}
          title="3D"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, opacity: live ? 1 : 0, transition: 'opacity .4s' }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: color.paper, overflow: 'hidden' },
});
