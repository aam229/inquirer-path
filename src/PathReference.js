import fs from 'fs';
import path from 'path';

/**
 * Similar to path.basename but does not resolve '.' and '..'
 * @param {...string} parts - The path parts
 * @returns {string} output - The path's basename
 */
export function join(...parts) {
  if (parts.length === 0) {
    return '';
  }
  const head = parts[0].startsWith(path.sep) ? path.sep : '';
  const tail = parts[parts.length - 1].endsWith(path.sep) ? path.sep : '';
  const center = parts
    .map((part) => {
      return part.slice( part.startsWith(path.sep) ? 1 : 0, part.endsWith(path.sep) ? -1 : undefined);
    })
    .filter((part) => !!part)
    .join(path.sep);

  // If '/' is passed, avoid ending up with '//' as the result.
  if (center.length > 0 || head.length === 0 || tail.length === 0) {
    return head + center + tail;
  }
  return head;
}

/**
 * Similar to path.resolve but does not resolve '.' and '..'
 * @param {...string} parts - A path
 * @returns {string} output - The resolved path
 */
export function resolve(...parts) {
  const filteredParts = parts
    .filter((part) => !!part)
    .reduce((fParts, part) => {
      if (part.startsWith(path.sep)) {
        return [ part ];
      }
      return fParts.concat(part);
    }, []);
  return join(...filteredParts);
}

/**
 * Similar to path.basename but does not resolve '.' and '..'
 * @param {string} input - A path
 * @returns {string} output - The path's basename
 */
export function basename(input) {
  if (input.endsWith(path.sep)) {
    return path.basename(input);
  }
  return input.substr(input.lastIndexOf(path.sep) + 1);
}


/**
 * Similar to path.dirname but does not resolve '.' and '..'
 * @param {string} input - A path
 * @returns {string} output - The path's dirname
 */
export function dirname(input) {
  if (input.endsWith(path.sep)) {
    const dir = path.dirname(input);
    // Avoid the case where the provided dir is just '/'
    return dir.endsWith(path.sep) ? dir : (dir + path.sep);
  }
  const separatorIndex = input.lastIndexOf(path.sep);
  if (separatorIndex === -1) {
    return '';
  } else if (separatorIndex === 0) {
    return path.sep;
  }
  return input.substr(0, separatorIndex);
}

/**
 * Append a path separator if it is not present
 * @param {string} input - A path to a directory
 * @returns {string} The input with a separator at the end
 */
export function appendPathSeparator(input) {
  return input.endsWith(path.sep) ? input : (input + path.sep);
}

/**
 * Determines if a path refers to an existing item
 * @param {string} fullPath The path to the item
 * @returns {boolean} True if the item exists
 */
export function exists(fullPath) {
  try {
    fs.accessSync(fullPath, fs.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Determines if a path refers to an existing file
 * @param {string} fullPath The path to the file
 * @returns {boolean} True if it is a file
 */
export function isFile(fullPath) {
  return exists(fullPath) && fs.statSync(fullPath).isFile();
}


/**
 * Determines if a path refers to an existing directory
 * @param {string} fullPath The path to the directory
 * @returns {boolean} True if it is a directory
 */
export function isDirectory(fullPath) {
  return exists(fullPath) && fs.statSync(fullPath).isDirectory();
}

/**
 * A directory child. It can be a file or another directory
 */
export default class PathReference {
  /**
   * Constant for a directory reference
   * @type {string}
   */
  static DIRECTORY = 'directory';

  /**
   * Constant for a file reference
   * @type {string}
   */
  static FILE = 'file';

  /**
   * Create a new {@link PathReference}
   * @param {...string} pathParts - The parts of the path.
   */
  constructor(...pathParts) {
    /**
     * @type {string}
     * @private
     */
    this.path = join(...pathParts);

    /**
     * @type {string}
     * @private
     */
    this.type = null;

    if (this.path.endsWith(path.sep)) {
      this.type = PathReference.DIRECTORY;
    } else {
      this.type = PathReference.FILE;
    }

    /**
     * @type {string}
     * @private
     */
    this.name = basename(this.path);

    /**
     * @type {string}
     * @private
     */
    this.parentDirectory = dirname(this.path);
  }

  /**
   * The name of the file or directory
   * @returns {string} The child's name.
   */
  getName() {
    return this.name;
  }

  /**
   * The absolute path of the file or directory
   * @returns {string} The child's absolute path
   */
  getPath() {
    return this.path;
  }

  /**
   * The absolute path to the item's parent directory
   * @returns {string} The absolute path to the item's parent directory
   */
  getParentDirectory() {
    return this.parentDirectory;
  }

  /**
   * The absolute path to the deepest directory in the path to the reference. It is the path
   * of the reference itself if the reference is a directory.
   * @returns {string} The absolute path to the deepest directory in the path to the reference
   */
  getDeepestDirectory() {
    return this.isDirectory() ? this.getPath() : this.getParentDirectory();
  }

  /**
   * Getter to determine if the path refers to a directory
   * @returns {boolean} True if the path refers to a directory
   */
  isDirectory() {
    return this.type === PathReference.DIRECTORY;
  }

  /**
   * Getter to determine if the path refers to a file
   * @returns {boolean} True if the path refers to a file
   */
  isFile() {
    return this.type === PathReference.FILE;
  }

  /**
   * Get the reference type.
   * It is one of {@link PathReference.DIRECTORY}, {@link PathReference.FILE} and {@link PathReference.UNKNOWN}
   * @returns {string} The reference type
   */
  getType() {
    return this.type;
  }

  /**
   * Getter to determine if the path exists
   * @returns {boolean} True if the path exists
   */
  exists() {
    return exists(this.path);
  }
}
