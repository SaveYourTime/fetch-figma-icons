import { getFile } from './api';
import { generateSVGs, getComponents, getSVGsFromComponents } from './utils';

const main = async () => {
  const file = await getFile();
  const components = getComponents(file.componentSets, file.components);
  const svgs = await getSVGsFromComponents(components);
  await generateSVGs(svgs);
};
main();
