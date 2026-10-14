import { createContext, useContext } from "react";

// The window and document a component is drawn in. Normally the page's own;
// inside the sandbox's DeviceFrame it's the frame's, so overlays portal into
// the frame and size checks (matchMedia, innerWidth) use the frame's width.
export interface FrameEnv {
  win: Window;
  doc: Document;
}

export const FrameContext = createContext<FrameEnv | null>(null);

export const useFrameWindow = (): Window => useContext(FrameContext)?.win ?? window;
export const useFrameDocument = (): Document => useContext(FrameContext)?.doc ?? document;
