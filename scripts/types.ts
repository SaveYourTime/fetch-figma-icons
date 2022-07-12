interface Component {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: unknown[];
}

interface ComponentSet {
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
  components: { [key: string]: Component };
  componentSets: { [key: string]: ComponentSet };
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
      components: { [key: string]: Component };
      componentSets: { [key: string]: ComponentSet };
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
