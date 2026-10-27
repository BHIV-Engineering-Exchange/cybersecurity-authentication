declare module 'react-simple-maps' {
  export interface Geography {
    rsmKey: string;
    properties: Record<string, any>;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: Geography[] }) => React.ReactNode;
  }

  export const ComposableMap: React.FC<{ children: React.ReactNode; [key: string]: any }>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<{ geography: Geography; [key: string]: any }>;
  export const Marker: React.FC<MarkerProps>;
  export const ZoomableGroup: React.FC<{ children: React.ReactNode; [key: string]: any }>;
}
