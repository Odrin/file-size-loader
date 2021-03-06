import fs from 'fs';
import path from 'path';
import loaderUtils from 'loader-utils';
import validateOptions from 'schema-utils';
import imageSize from 'image-size';
import schema from './options.json';

const imgFormats = ['jpg', 'jpeg', 'png'];

export default function loader(content) {
  if (!this.emitFile) throw new Error('File Loader\n\nemitFile is required from module system');

  const options = loaderUtils.getOptions(this) || {};

  validateOptions(schema, options, 'File Loader');

  const context =
    options.context ||
    this.rootContext ||
    (this.options && this.options.context);

  let url = loaderUtils.interpolateName(this, options.name, {
    context,
    content,
    regExp: options.regExp,
  });

  let outputPath = '';

  if (options.outputPath) {
    // support functions as outputPath to generate them dynamically
    outputPath = (
      typeof options.outputPath === 'function' ? options.outputPath(url) : options.outputPath
    );
  }

  const filePath = this.resourcePath;
  const size = fs.statSync(filePath).size;
  const format = path.extname(filePath).replace('.', '').toLowerCase();

  if (options.useRelativePath) {
    const issuer = options.context
      ? context
      : this._module && this._module.issuer && this._module.issuer.context;

    const relativeUrl = issuer && path.relative(issuer, filePath).split(path.sep).join('/');

    const relativePath = relativeUrl && `${path.dirname(relativeUrl)}/`;
    // eslint-disable-next-line no-bitwise
    if (~relativePath.indexOf('../')) {
      outputPath = path.posix.join(outputPath, relativePath, url);
    } else {
      outputPath = relativePath + url;
    }

    url = relativePath + url;
  } else if (options.outputPath) {
    // support functions as outputPath to generate them dynamically
    outputPath = typeof options.outputPath === 'function' ? options.outputPath(url) : options.outputPath + url;

    url = outputPath;
  } else {
    outputPath = url;
  }

  let publicPath = `__webpack_public_path__ + ${JSON.stringify(url)}`;

  if (options.publicPath !== undefined) {
    // support functions as publicPath to generate them dynamically
    publicPath = JSON.stringify(
      typeof options.publicPath === 'function' ? options.publicPath(url) : options.publicPath + url,
    );
  }

  if (options.emitFile === undefined || options.emitFile) {
    this.emitFile(outputPath, content);
  }

  if (options.imageSize && imgFormats.indexOf(format) !== -1) {
    const dimensions = imageSize(filePath);

    return `module.exports = {
    src: ${publicPath},
    format: "${format}",
    size: ${size},
    width: ${dimensions.width},
    height: ${dimensions.height}
    };`;
  }

  return `module.exports = { src: ${publicPath}, format: "${format}", size: ${size} };`;
}

export const raw = true;
