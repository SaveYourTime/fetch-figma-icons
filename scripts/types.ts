export enum ComponentStyle {
  FILLED = 'filled',
  OUTLINED = 'outlined',
  TWO_TONED = 'twotoned',
}

export enum ComponentSize {
  '20PX' = '20px',
  '24PX' = '24px',
}

export enum ComponentMotif {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface MetaComponent {
  id: string;
  name: string;
  setName: string;
  componentName: string;
  style: ComponentStyle;
  size: ComponentSize;
}

export interface SVGComponent extends MetaComponent {
  svg: string;
}

export interface FileComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: unknown[];
}

export interface FileComponentSet {
  key: string;
  name: string;
  description: string;
}

export interface FileResponse {
  document: {
    id: string;
    name: string;
    type: string;
    children: {
      // some properties are missing and not fully typed here
      id: string;
      name: string;
      type: string;
      children: unknown[];
    }[];
  };
  components: { [key: string]: FileComponent };
  componentSets: { [key: string]: FileComponentSet };
  schemaVersion: number;
  styles: {
    [key: string]: {
      key: string;
      name: string;
      styleType: string;
      description: string;
    };
  };
  name: string;
  lastModified: string;
  thunbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
}

export interface FileNodeResponse {
  name: string;
  lastModified: string;
  thunbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
  nodes: {
    [key: string]: {
      document: {
        // some properties are missing and not fully typed here
        id: string;
        name: string;
        type: string;
        children: unknown[];
      };
      components: { [key: string]: FileComponent };
      componentSets: { [key: string]: FileComponentSet };
      schemaVersion: number;
      styles: {
        [key: string]: {
          key: string;
          name: string;
          styleType: string;
          description: string;
        };
      };
    };
  };
}

export interface ImageResponse {
  err: string | null;
  images: { [key: string]: string };
}
