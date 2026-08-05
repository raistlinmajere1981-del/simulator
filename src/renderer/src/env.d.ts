import type { SimulatorDesktopApi } from '../../shared/simulator';

declare global {
  interface Window {
    simulatorDesktop: SimulatorDesktopApi;
  }
}

export {};
