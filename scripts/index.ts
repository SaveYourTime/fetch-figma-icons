import fs from 'fs/promises';
import { getFile } from './api';
import { generateSVGs, getComponents, getSVGsFromComponents } from './utils';
import { MetaErrorCollection } from './validation';

const main = async () => {
  const errorCollection = new MetaErrorCollection();
  const file = await getFile();
  const components = getComponents(file, errorCollection);
  const svgs = await getSVGsFromComponents(components, errorCollection);
  await generateSVGs(svgs, errorCollection);
  console.table(errorCollection.report('array'));
  await fs.writeFile('./error.csv', errorCollection.report('csv'));
};
main();
