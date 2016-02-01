import path from 'path';
import fs from 'fs';
import PathReference, { isDirectory, join, resolve, appendPathSeparator } from './PathReference';

/**
 * A shell abstraction for autocompleting paths
 */
export default class ShellPathAutocomplete {
  /**
   * Create a new {@link ShellPath} instance.
   * @param {!string} cwd - The shell's working directory
   * @param {boolean} directoryOnly - Set to true if the {@link ShellPath} should handle only directories
   */
  constructor(cwd, directoryOnly = false) {
    if (!isDirectory(cwd)) {
      throw new Error(`The provided working directory ${cwd} does not exist or is not a directory.`);
    }

    /**
     * The current working directory
     * @type {PathReference}
     * @private
     */
    this.cwd = new PathReference(appendPathSeparator(cwd));

    /**
     * True if only directories should be in the {@link ShellPath.potentialPaths}.
     * @type {boolean}
     * @private
     */
    this.directoryOnly = !!directoryOnly;

    /**
     * The path displayed in the shell. It may be relative to the {@link ShellPath.cwd} or absolute.
     * @type {string}
     * @private
     */
    this.inputPath = '';

    /**
     * The {@link PathReference} instance based on the {@link ShellPath.inputPath} and {@link ShellPath.cwd}.
     * @type {PathReference}
     * @private
     */
    this.inputPathReference = null;

    /**
     * An array of potential paths under the directory of the current {@link ShellPath.inputPath}.
     * @type {Array<PathReference>}
     * @private
     */
    this.potentialPaths = null;

    /**
     * The index of the selected path within the {@link ShellPath.potentialPaths} array
     * @type {string}
     * @private
     */
    this.selectedPotentialPathIndex = -1;

    /**
     * A prefix common to all the potential paths.
     * @type {PathReference}
     * @private
     */
    this.commonPotentialPath = null;

    /**
     * Determine if there is any need to perform a refresh.
     * @type {PathReference}
     * @private
     */
    this.fresh = false;

    // Retrieve all the information for the current input (cwd directory)
    this.setInputPath(this.inputPath);
  }

  /**
   * Get the working directory
   * @returns {PathReference} The working directory
     */
  getWorkingDirectory() {
    return this.cwd;
  }

  /**
   * Get the {@link ShellPath}'s input path
   * @params {boolean} includeSelection - If set to true, the current selection is merged with the input path.
   * @returns {string} The input path
   */
  getInputPath(includeSelection = false) {
    if (!includeSelection || !this.hasSelectedPath()) {
      return this.inputPath;
    }
    return this.format(this.getSelectedPath());
  }

  /**
   * Get the {@link PathReference} for the current {@link ShellPath.inputPath}
   * @returns {PathReference} The {@link PathReference} for the current {@link ShellPath.inputPath}.
   */
  getInputPathReference() {
    return this.inputPathReference;
  }

  /**
   * Get a list of potential paths based on the {@link ShellPath.baseInputDirectory} and {@link ShellPath.baseInputName}
   * @returns {Array.<PathReference>}
   */
  getPotentialPaths() {
    return this.potentialPaths;
  }

  /**
   * Get the {@link PathReference} to the currently selected path
   * @returns {PathReference} The {@link PathReference} to the currently selected path
   */
  getSelectedPath() {
    if (!this.hasSelectedPath()) {
      return null;
    }
    return this.potentialPaths[this.selectedPotentialPathIndex];
  }

  /**
   * Get if the {@link ShellPath} currently has a selected path.
   * @returns {boolean} True if the {@link ShellPath} currently has a selected path.
   */
  hasSelectedPath() {
    return this.selectedPotentialPathIndex !== -1;
  }

  /**
   * A prefix common to all the potential paths.
   * @returns {PathReference}
   */
  getCommonPotentialPath() {
    return this.commonPotentialPath;
  }

  /**
   * Get if there is a common potential paths different than the input path.
   * @returns {boolean} True if there is a common potential paths different than the input path.
   */
  hasCommonPotentialPath() {
    return this.commonPotentialPath !== this.inputPathReference;
  }

  /**
   * Formats the path to relative or absolute path based on the input.
   * @private
   * @param {PathReference} pathReference
   * @returns {string} A path formatted according to the {@link ShellPathAutocomplete.inputPath}
   */
  format(pathReference) {
    // TODO: Seems sketchy
    const formattedPath = this.inputPath.substr(0, this.inputPath.lastIndexOf(path.sep) + 1) + pathReference.getName();
    return pathReference.isDirectory() ? formattedPath + path.sep : formattedPath;
  }

  /**
   * Set the input path from the user
   * @param {string|PathReference} input
   */
  setInputPath(input) {
    const inputPath = input instanceof PathReference ? this.format(input) : input;
    if (this.inputPathReference !== null && inputPath === this.inputPath) {
      return;
    }
    this.fresh = false;
    this.inputPath = inputPath;
    this.inputPathReference = new PathReference(resolve(this.cwd.getPath(), inputPath));
    this.selectedPotentialPathIndex = -1;
  }

  /**
   * Refresh the potential paths.
   */
  refresh() {
    if (this.fresh) {
      return;
    }
    this.fresh = true;
    this.potentialPaths = this.findPotentialPaths();
    this.commonPotentialPath = this.findCommonPotentialPath();
  }

  /**
   * Got to the next potential path using a circular algorithm.
   * @param {boolean} forward - If true, move to the next potential path. Otherwise move to the previous potential path.
   * @returns {PathReference} The {@link PathReference} of the selected potential path
   */
  selectNextPotentialPath(forward = true) {
    // TODO: Does this really belong here? It could be part of the prompt itself.
    if (this.potentialPaths.length === 0) {
      this.selectedPotentialPathIndex = -1;
      return null;
    }
    const position = this.selectedPotentialPathIndex + ((forward) ? 1 : -1);
    const boundedPosition = position % this.potentialPaths.length;
    this.selectedPotentialPathIndex = (position >= 0) ? boundedPosition : this.potentialPaths.length + boundedPosition;
    return this.getSelectedPath();
  }

  /**
   * Reset the selected potential path.
   */
  resetSelectPotentialPath() {
    this.selectedPotentialPathIndex = -1;
  }

  /**
   * Find a common path for all the potential paths.
   * It returns a value when there is common match to all the potential paths.
   * @private
   * @returns {PathReference} A common path to all the potential paths
   */
  findCommonPotentialPath() {
    const potentialPaths = this.getPotentialPaths();
    const reference = this.getInputPathReference();

    if (potentialPaths.length === 0) {
      return reference;
    } else if (potentialPaths.length === 1) {
      return potentialPaths[0];
    }
    // Sort the paths. The 2 extremes are the most different.
    const sortedName = potentialPaths
      .map((ppath) => ppath.getName())
      .sort();
    const a1 = sortedName[0];
    const a2 = sortedName[sortedName.length - 1];
    // Find the common prefix between a1 and a2.
    let i = 0;
    while (i < a1.length && a1.charAt(i) === a2.charAt(i)) {
      i++;
    }
    const prefix = a1.substr(0, i);
    if (i === 0 || prefix === reference.getName()) {
      return reference;
    }
    return new PathReference(reference.getDeepestDirectory(), prefix);
  }

  /**
   * Find a list of potential paths.
   * Potential paths are within the {@link ShellPath.basePath} and start with the {@link ShellPath.baseName}
   * @private
   * @returns {Array<PathReference>} - The potential paths.
   */
  findPotentialPaths() {
    const reference = this.getInputPathReference();
    const directory = reference.getDeepestDirectory();
    // For a directory, no need to filter on a prefix.
    const prefix = reference.isDirectory() ? '' : reference.getName();
    if (!isDirectory(directory)) {
      return [];
    }

    return fs.readdirSync(directory)
      // Filter on the base input name
      .filter((child) => {
        return child.startsWith(prefix);
      })
      // Map to PathReference instances
      .map((name) => {
        const childPath = join(directory, name);
        if (isDirectory(childPath)) {
          return new PathReference(childPath + path.sep);
        }
        return new PathReference(childPath);
      })
      // Get rid of non directory if the ShellPath handles directories only
      .filter((child) => {
        return child.isDirectory() || !this.directoryOnly;
      })
      // Sort by directory/file and then name
      .sort((child1, child2) => {
        if (child1.getType() === child2.getType()) {
          return child1.getName().localeCompare(child2.getName());
        }
        return ! child1.isDirectory();
      });
  }
}
