import { mkdir, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import { assign, chunk } from 'lodash';
import { resolve } from 'path';
import rimraf from 'rimraf';
import { loadConfig, optimize } from 'svgo';
import { getImages, getSVG } from './api';
import { FileResponse } from './types';

interface Component {
  id: string;
  name: string;
  style: 'Filled' | 'Outlined' | 'TwoToned';
  size: '20px' | '24px';
}

interface SVGComponent extends Component {
  svg: string;
}

const SVG_PATH = 'src/svg';

export const getComponents = (
  componentSets: FileResponse['componentSets'],
  components: FileResponse['components'],
): Component[] =>
  Object.entries(components).reduce((result: Component[], [id, component]) => {
    const { componentSetId } = component;
    const componentSet = componentSetId && componentSets[componentSetId];

    if (componentSet) {
      // remove empty spaces and dashes from componentSet name
      const name = componentSet.name.replace(/ |-|\(|\)|\//g, '');

      // extract style, size, mode from component name
      const properties = component.name.split(', ');
      const style = (properties
        .find((property) => property.toLowerCase().startsWith('style='))
        ?.replace(/Style=|-/g, '') ?? '') as Component['style'] | '';
      const size = (properties
        .find((property) => property.toLowerCase().startsWith('size='))
        ?.replace(/Size=|-/g, '') ?? '') as Component['size'] | '';
      const mode = (properties
        .find((property) => property.toLowerCase().startsWith('mode='))
        ?.replace(/Mode=|-/g, '') ?? '') as 'Light' | 'Dark' | '';

      // skip components with outlined style
      if (style.toLowerCase() === 'outlined') return result;
      // skip dark mode for now
      if (mode.toLowerCase() === 'dark') return result;
      // skip components with invalid style
      if (!style || !['filled', 'twotoned'].includes(style.toLowerCase())) {
        console.log('Invalid style:', name, style);
        return result;
      }
      // skip components with invalid size
      if (!size || !['20px', '24px'].includes(size.toLowerCase())) {
        console.log('Invalid size:', name, size);
        return result;
      }

      result.push({ id, name, style, size });
    } else {
      console.log('ComponentSet not found:', component.name);
    }

    return result;
  }, []);

export const getSVGsFromComponents = async (components: Component[]) => {
  const CHUNK_SIZE = 50;
  const ids = components.map((component) => component.id);
  const idChunks = chunk(ids, CHUNK_SIZE);
  const imageGroups = await Promise.all(
    idChunks.map((idChunk) => getImages(idChunk.join(','))),
  );
  const images = assign({}, ...imageGroups);
  return Promise.all(
    components
      .filter(({ id, name }) => {
        const imageUrl = images[id];
        if (!imageUrl) {
          console.log('Image url not found:', name);
          return false;
        }
        return true;
      })
      .map(async ({ id, name, style, size }) => {
        const imageUrl = images[id];
        const svg = await getSVG(imageUrl);
        return { id, name, style, size, svg };
      }),
  );
};

const sanitizeSVGs = (components: SVGComponent[]) =>
  components.filter((component, index, items) => {
    if (!component.svg) {
      console.log('SVG not fould:', component.name);
      return false;
    }
    if (
      items.findIndex(
        (item) =>
          item.name === component.name &&
          item.style === component.style &&
          item.size === component.size,
      ) !== index
    ) {
      console.log('Duplicate found:', component.name);
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

export const generateSVGs = async (svgs: SVGComponent[]) => {
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
        [key: Component['name']]: {
          [key in Component['style']]: string;
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
    Object.entries(groupedSVGs).map(async ([name, { Filled, TwoToned }]) => {
      if (!Filled || !TwoToned) {
        console.log('Missing Filled or TwoToned SVG:', name);
        return;
      }
      const FilledSVGDOM = new JSDOM(Filled).window.document.querySelector(
        'svg',
      );
      const filledWithoutSVGTag = FilledSVGDOM?.innerHTML ?? '';
      const TwoTonedSVGDOM = new JSDOM(TwoToned).window.document.querySelector(
        'svg',
      );
      TwoTonedSVGDOM?.insertAdjacentHTML('beforeend', filledWithoutSVGTag);
      const combinedSVG = TwoTonedSVGDOM?.outerHTML ?? '';
      if (!combinedSVG) {
        console.log('Failed to combine SVG:', name);
        return;
      }
      const path = resolve(SVG_PATH, `${name}.svg`);
      const modifiedSVG = modifySVG(combinedSVG);
      const optimizedSVG = await optimizeSVG(modifiedSVG, path);
      await writeFile(path, optimizedSVG, { encoding: 'utf8' });
    }),
  );
};
