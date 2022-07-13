import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import rimraf from 'rimraf';
import { loadConfig, optimize } from 'svgo';
import { getImages, getSVG } from './api';
import { FileResponse } from './types';

const SVG_PATH = 'src/svg';

export const getComponents = (
  componentSets: FileResponse['componentSets'],
  components: FileResponse['components'],
): { id: string; name: string }[] =>
  Object.entries(components).reduce(
    (result: { id: string; name: string }[], [id, component]) => {
      const { componentSetId } = component;
      const componentSet = componentSetId && componentSets[componentSetId];

      if (componentSet) {
        // remove empty spaces and dashes from componentSet name
        const name = componentSet.name.replace(/ |-/g, '');

        // extract style, size, mode from component name
        const [style, size, mode] = component.name
          .split(', ')
          .map((property) => property.replace(/Style=|Size=|Mode=|-/g, ''));

        // skip dark mode for now
        if (mode?.toLowerCase() === 'dark') return result;

        const prefix = size === '24px' ? 'Nav' : '';
        const componentName = `${prefix}${name}${style}`;
        result.push({ id, name: componentName });
      }

      return result;
    },
    [],
  );

export const getSVGsFromComponents = async (
  components: { id: string; name: string }[],
): Promise<{ id: string; name: string; svg: string }[]> => {
  const ids = components.map((component) => component.id);
  const images = await getImages(ids.join(','));
  return Promise.all(
    components.map(async ({ id, name }) => {
      const imageUrl = images[id];
      const svg = await getSVG(imageUrl);
      return { id, name, svg };
    }),
  );
};

const sanitizeSVGs = (
  components: { id: string; name: string; svg: string }[],
) =>
  components.filter((component, index, items) => {
    if (!component.svg) {
      console.log('SVG not fould:', component.name);
      return false;
    }
    if (items.findIndex((item) => item.name === component.name) !== index) {
      console.log('Duplicate found:', component.name);
      return false;
    }
    return true;
  });

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
  svgs: { id: string; name: string; svg: string }[],
) => {
  // clean svg folder
  await new Promise((res, rej) => {
    rimraf(SVG_PATH, (err) => (err ? rej(err) : res(true)));
  });
  // create svg folder if not exists
  await mkdir(SVG_PATH, { recursive: true });
  await Promise.all(
    sanitizeSVGs(svgs).map(async ({ name, svg }) => {
      const path = resolve(SVG_PATH, `${name}.svg`);
      const optimizedSVG = await optimizeSVG(svg, path);
      await writeFile(path, optimizedSVG, { encoding: 'utf8' });
    }),
  );
};
