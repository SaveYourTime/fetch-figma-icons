// eslint-disable-next-line max-classes-per-file
import {
  ComponentSize,
  ComponentStyle,
  FileComponent,
  FileComponentSet,
  MetaComponent,
  SVGComponent,
} from './types';

export enum StyleErrorCode {
  PROPERTY_NOT_EXISTED = 1000,
  INVALID_VALUE = 1001,
}

export enum SizeErrorCode {
  PROPERTY_NOT_EXISTED = 2000,
  INVALID_VALUE = 2001,
}

export enum SourceErrorCode {
  IMAGE_URL_NOT_FOUND = 3000,
  SVG_NOT_FOUND = 3001,
  COMPONENT_NAME_DUPLICATED = 3002,
  MISSING_FILLED_SVG = 3003,
  MISSING_TWOTONED_SVG = 3004,
  COMBINE_FAIL = 3005,
  COMPONENT_SET_NOT_FOUND = 3006,
}

export class MetaError<R> {
  static ERROR_MESSAGE: Record<number, string> = {
    [StyleErrorCode.PROPERTY_NOT_EXISTED]: `Can't found Component Property 'Style'`,
    [StyleErrorCode.INVALID_VALUE]: `The value of Component Property 'Style' should be 'Filled', 'TwoToned', 'Outlined'`,
    [SizeErrorCode.PROPERTY_NOT_EXISTED]: `Can't found Component Property 'Size'`,
    [SizeErrorCode.INVALID_VALUE]: `The value of Component Property 'Size' should be '20px', '24px'`,
    [SourceErrorCode.IMAGE_URL_NOT_FOUND]: `Can't found source url`,
    [SourceErrorCode.SVG_NOT_FOUND]: `Can't found svg`,
    [SourceErrorCode.COMPONENT_SET_NOT_FOUND]: `Can't found icon name from parents' layer`,
    [SourceErrorCode.COMPONENT_NAME_DUPLICATED]: `There are duplicated naming for several svgs`,
    [SourceErrorCode.MISSING_FILLED_SVG]: `svg for 'Filled' style is missing`,
    [SourceErrorCode.MISSING_TWOTONED_SVG]: `svg for 'TowToned' style is missing`,
  };

  errorCode: number | undefined;

  raw: R;

  constructor(raw: R, errorCode?: number) {
    this.raw = raw;
    this.errorCode = errorCode;
  }

  toString(): string {
    return this.errorCode
      ? `[${this.errorCode}] ${MetaError.ERROR_MESSAGE[this.errorCode]}`
      : '';
  }
}

export class MetaErrorCollection {
  arr: MetaError<any>[] = [];

  add(raw: any, errorCode?: number) {
    this.arr.push(new MetaError(raw, errorCode));
  }

  report(format: 'array'): { name?: string; error?: string; url?: string }[];
  report(format: 'csv'): string;
  report(format: string): any {
    const formatted = this.arr
      .sort((a, b) => (a.raw.name > b.raw.name ? 1 : -1))
      .map((error) => ({
        name: error.raw.name,
        error: error.toString(),
        url: error.raw.id
          ? `https://www.figma.com/file/${
              process.env.FIGMA_FILE_KEY
            }?node-id=${error.raw.id.toString()}`
          : '',
      }));

    switch (format) {
      case 'csv':
        return [
          'name,error,url',
          formatted
            .map(({ name, error, url }) => `"${name}","${error}","${url}"`)
            .join('\n'),
        ].join('\n');
      case 'array':
      default:
        return formatted;
    }
  }
}

function validateStyle(val: any): StyleErrorCode | undefined {
  if (!val) return StyleErrorCode.PROPERTY_NOT_EXISTED;
  if (
    ![
      ComponentStyle.FILLED,
      ComponentStyle.TWO_TONED,
      ComponentStyle.OUTLINED,
    ].includes(val)
  )
    return StyleErrorCode.INVALID_VALUE;
  return undefined;
}

function validateSize(val: any): SizeErrorCode | undefined {
  if (!val) return SizeErrorCode.PROPERTY_NOT_EXISTED;
  if (![ComponentSize['20PX'], ComponentSize['24PX']].includes(val))
    return SizeErrorCode.INVALID_VALUE;
  return undefined;
}

export function isValidMetaComponent(
  val: Record<string, any>,
  errors?: MetaErrorCollection,
): val is MetaComponent {
  const { style, size } = val;
  const errorCode = validateStyle(style) || validateSize(size);
  if (errorCode) errors?.add(val, errorCode);

  return !errorCode;
}

export function isValidSvgComponent(
  val: Record<string, any>,
  errors?: MetaErrorCollection,
): val is SVGComponent {
  const { svg } = val;
  const valid = !!svg;
  if (!valid) errors?.add(val, SourceErrorCode.SVG_NOT_FOUND);

  return valid;
}

export function isComponentNameDuplicated(
  component: SVGComponent,
  arr: SVGComponent[],
  errors?: MetaErrorCollection,
): boolean {
  const duplicated = arr.some(
    (item) =>
      item !== component &&
      item.name === component.name &&
      item.style === component.style &&
      item.size === component.size,
  );

  if (duplicated) {
    errors?.add(component, SourceErrorCode.COMPONENT_NAME_DUPLICATED);
  }

  return duplicated;
}

export function isValidGroupedSvg(
  val: {
    name: string;
    [ComponentStyle.FILLED]?: string;
    [ComponentStyle.TWO_TONED]?: string;
  },
  errors?: MetaErrorCollection,
): boolean {
  const { name, filled, twotoned } = val;
  if (!filled) {
    errors?.add({ name }, SourceErrorCode.MISSING_FILLED_SVG);
    return false;
  }

  if (!twotoned) {
    errors?.add({ name }, SourceErrorCode.MISSING_TWOTONED_SVG);
    return false;
  }

  return true;
}

export function isValidFileComponent(
  component: FileComponent,
  componentSet: Record<string, FileComponentSet>,
  errors?: MetaErrorCollection,
): boolean {
  const valid = !!(
    component.componentSetId && componentSet[component.componentSetId]
  );
  if (!valid) {
    errors?.add(component, SourceErrorCode.COMPONENT_SET_NOT_FOUND);
  }

  return valid;
}
