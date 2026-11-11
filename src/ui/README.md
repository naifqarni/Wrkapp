# wrk. UI

Import components from `@/ui`, tokens from `@/theme`, layout from `@/layout`, order tracking from `@/native`.
Every file starts with a comment that says when to use it. See them all at `/dev/ui`
(`?fold=v` simulates an unfolded phone, `?fold=h` a half-open one).

Full notes: `/mnt/project-files/app/handoff/native.md`.

Rules:
- Arabic first, RTL: start/end, never left/right. Numbers, prices, mm and "wrk." go through `Num`, `Price`, `Wordmark`.
- No accent colour. The product is the only black object; the primary button is the only black control.
- Use the system's navigation: `NativeTabs`, the native Stack header (`stackHeader`), `sheetRoute`. Do not draw custom bars.
- Layout by window width (`useLayoutClass`), never by device model. Two panes from 700pt (`TwoPane`).
- Motion behaves like a real object. No bounce for show. Respect Reduce Motion.
