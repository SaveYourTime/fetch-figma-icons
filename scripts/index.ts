import { getFile } from './api';
import { generateSVGs, getComponents, getSVGsFromComponents } from './utils';
import { exportErrors, MetaError } from './validation';

const main = async () => {
  const errors: MetaError<any>[] = [];
  const file = await getFile();
  const components = getComponents(file, errors);
  const svgs = await getSVGsFromComponents(components, errors);
  await generateSVGs(svgs, errors);
  await exportErrors(errors);
};
main();
