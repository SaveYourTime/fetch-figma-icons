import { mkdir, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import { assign, chunk } from 'lodash';
import { resolve } from 'path';
import rimraf from 'rimraf';
import { loadConfig, optimize } from 'svgo';
import { getImages, getSVG } from './api';
import {
  ComponentMotif,
  ComponentSize,
  ComponentStyle,
  FileResponse,
  MetaComponent,
  SVGComponent,
} from './types';
import {
  isComponentNameDuplicated,
  isValidFileComponent,
  isValidGroupedSvg,
  isValidMetaComponent,
  isValidSvgComponent,
  MetaError,
  SourceErrorCode,
} from './validation';

const SVG_PATH = 'src/svg';

export const getComponents = (
  { componentSets, components }: FileResponse,
  errors: MetaError<any>[] = [],
): MetaComponent[] =>
  Object.entries(components).reduce(
    (draft: MetaComponent[], [id, component]) => {
      if (!isValidFileComponent(component, componentSets, errors)) {
        return draft;
      }

      const componentSet = componentSets[component.componentSetId!];
      // remove empty spaces and dashes from componentSet name
      const name = componentSet.name.replace(/ |-|\(|\)|\//g, '');

      // extract style, size, mode from component name
      const properties = component.name.split(', ');
      const style = properties
        .find((property) => property.toLowerCase().startsWith('style='))
        ?.replace(/Style=|-/g, '')
        ?.toLowerCase() as ComponentStyle | undefined;
      const size = properties
        .find((property) => property.toLowerCase().startsWith('size='))
        ?.replace(/Size=|-/g, '')
        ?.toLowerCase() as ComponentSize | undefined;
      const mode = properties
        .find((property) => property.toLowerCase().startsWith('mode='))
        ?.replace(/Mode=|-/g, '')
        ?.toLowerCase() as ComponentMotif | undefined;

      const comp = {
        id,
        name,
        style,
        size,
        setName: componentSet.name,
        componentName: component.name,
      };
      if (!isValidMetaComponent(comp, errors)) return draft;

      // skip components with outlined style
      if (style === ComponentStyle.OUTLINED) return draft;
      // skip dark mode for now
      if (mode === ComponentMotif.DARK) return draft;

      draft.push(comp);

      return draft;
    },
    [],
  );

const CHUNK_SIZE = 50;

export const getSVGsFromComponents = async (
  components: MetaComponent[],
  errors: MetaError<any>[] = [],
) => {
  const ids = components.map((component) => component.id);
  const idChunks = chunk(ids, CHUNK_SIZE);
  const imageGroups = await Promise.all(
    idChunks.map((idChunk) => getImages(idChunk.join(','))),
  );
  const images = assign({}, ...imageGroups);
  return Promise.all(
    components
      .filter((component) => {
        const { id } = component;
        const imageUrl = images[id];
        if (!imageUrl) {
          errors.push({
            errorCode: SourceErrorCode.IMAGE_URL_NOT_FOUND,
            raw: component,
          });
          return false;
        }
        return true;
      })
      .map(async ({ id, name, style, size }) => {
        const imageUrl = images[id];
        const svg = await getSVG(imageUrl);
        return { id, name, style, size, svg } as SVGComponent;
      }),
  );
};

const sanitizeSVGs = (
  components: SVGComponent[],
  errors: MetaError<any>[] = [],
) =>
  components.filter((component, index, items) => {
    if (!isValidSvgComponent(component, errors)) {
      return false;
    }

    if (isComponentNameDuplicated(component, items)) {
      return false;
    }

    return true;
  });

const modifySVG = (svg: string) =>
  svg
    .replace(/fill="#838691"/gi, 'fill="currentColor" class="filled"')
    .replace(/fill="#006FFF"/gi, 'fill="currentColor" class="outlined"')
    .replace(/fill="#E5F1FF"/gi, 'fill="currentColor" class="twoToned"');

const optimizeSVG = async (svg: string, path: string) => {
  const config = await loadConfig();
  const result = optimize(svg, { ...config, path });
  if ('data' in result) {
    const optimizedSVG = result.data;
    return optimizedSVG;
  }
  return svg;
};

export const generateSVGs = async (
  svgs: SVGComponent[],
  errors: MetaError<any>[] = [],
) => {
  // clean svg folder
  await new Promise((res, rej) => {
    rimraf(SVG_PATH, (err) => (err ? rej(err) : res(true)));
  });
  // create svg folder if not exists
  await mkdir(SVG_PATH, { recursive: true });
  const sanitizedSVGs = sanitizeSVGs(svgs);
  const groupedSVGs = sanitizedSVGs.reduce(
    (
      result: {
        [key: MetaComponent['name']]: {
          [key in MetaComponent['style']]: string;
        };
      },
      item,
    ) => {
      const { name, style, size, svg } = item;
      const svgName = size === '20px' ? name : `Nav${name}`;
      return { ...result, [svgName]: { ...result[svgName], [style]: svg } };
    },
    {},
  );
  await Promise.all(
    Object.entries(groupedSVGs).map(async ([name, { filled, twotoned }]) => {
      if (!isValidGroupedSvg({ name, filled, twotoned }, errors)) {
        return;
      }

      const FilledSVGDOM = new JSDOM(filled).window.document.querySelector(
        'svg',
      );
      const filledWithoutSVGTag = FilledSVGDOM?.innerHTML ?? '';
      const TwoTonedSVGDOM = new JSDOM(twotoned).window.document.querySelector(
        'svg',
      );
      TwoTonedSVGDOM?.insertAdjacentHTML('beforeend', filledWithoutSVGTag);
      const combinedSVG = TwoTonedSVGDOM?.outerHTML ?? '';
      if (!combinedSVG) {
        errors.push({
          errorCode: SourceErrorCode.COMBINE_FAIL,
          raw: { name },
        });
        return;
      }

      const path = resolve(SVG_PATH, `${name}.svg`);
      const modifiedSVG = modifySVG(combinedSVG);
      const optimizedSVG = await optimizeSVG(modifiedSVG, path);
      await writeFile(path, optimizedSVG, { encoding: 'utf8' });
    }),
  );
};
