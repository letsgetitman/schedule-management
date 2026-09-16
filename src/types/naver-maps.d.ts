// Minimal ambient typing for the Naver Maps JS SDK loaded via <script> at
// runtime. The real SDK doesn't ship official TypeScript types, so we keep
// this loose and only type what this project actually calls.
export {};

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (
          el: HTMLElement,
          options: Record<string, unknown>,
        ) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Marker: new (options: Record<string, unknown>) => {
          setMap: (map: NaverMapInstance | null) => void;
        };
        Event: {
          addListener: (
            target: unknown,
            eventName: string,
            handler: (...args: unknown[]) => void,
          ) => void;
        };
      };
    };
  }

  interface NaverMapInstance {
    setCenter: (latLng: unknown) => void;
    panTo: (latLng: unknown) => void;
  }
}
