import type { ComponentType, Ref } from 'react';
import { WebView, type WebViewProps } from 'react-native-webview';

export interface WVHandle { injectJavaScript: (js: string) => void; goBack: () => void; reload: () => void; stopLoading: () => void }
/** react-native-webview with usable types (its class generic defaults to `undefined`, which collapses the props to never). */
export const WV = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WVHandle> }>;
