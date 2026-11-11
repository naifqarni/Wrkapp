/** The product in 3D: the same models as the storefront, inside a WebView. The photo shows until the object is ready. */
import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';

import { color } from '@/theme';

import { thumb } from '../catalogue';
import { WV, type WVHandle } from '../webview';
import { parseEvent, type ViewerCommand, type ViewerHandle, type ViewerProps } from './protocol';

export const Viewer = forwardRef<ViewerHandle, ViewerProps>(function Viewer({ id, personal, onActions, onLive }, ref) {
  const web = useRef<WVHandle>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let on = true;
    import('./viewerHtml').then((m) => { if (on) setHtml(m.default); }).catch(() => onLive?.(false));
    return () => { on = false; };
  }, [onLive]);

  const send = useCallback((cmd: ViewerCommand) => {
    web.current?.injectJavaScript(`window.wrk&&window.wrk(${JSON.stringify(JSON.stringify(cmd))});true;`);
  }, []);

  useEffect(() => { if (ready) send({ type: 'show', id, personal }); }, [ready, id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && live) send({ type: 'personal', personal }); }, [personal.name, personal.latin, personal.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({ act: (actionId) => send({ type: 'action', id: actionId }) }), [send]);

  const onMessage = (e: WebViewMessageEvent) => {
    const m = parseEvent(e.nativeEvent.data);
    if (!m) return;
    if (m.type === 'ready') setReady(true);
    else if (m.type === 'shown') { setLive(true); onLive?.(true); onActions?.(m.actions); }
    else if (m.type === 'actions') onActions?.(m.actions);
    else if (m.type === 'failed') { setLive(false); onLive?.(false); }
  };

  return (
    <View style={styles.box}>
      <Image source={thumb(id)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      {html ? (
        <WV
          ref={web}
          source={{ html, baseUrl: 'https://localhost/' }}
          originWhitelist={['*']}
          onMessage={onMessage}
          onError={() => onLive?.(false)}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          setBuiltInZoomControls={false}
          textInteractionEnabled={false}
          androidLayerType="hardware"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', opacity: live ? 1 : 0 }]}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: color.paper, overflow: 'hidden' },
});
