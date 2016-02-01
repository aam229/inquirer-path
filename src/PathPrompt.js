import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import readline from 'readline';
import rx from 'rx-lite';
import runAsync from 'run-async';
import BasePrompt from 'inquirer/lib/prompts/base';

import ShellPathAutocomplete from './ShellPathAutocomplete';

const TAB_KEY = 'tab';
const ENTER_KEY = 'return';
const RANGE_SIZE = 5;

/**
 * An {@link Inquirer} prompt for a single path. It supports auto completing paths similarly to zsh.
 */
export default class PathPrompt extends BasePrompt {
  /**
   * Create a new prompt instance
   * @param args
   */
  constructor(...args) {
    super(...args);
    const cwd = this.opt.cwd || this.opt.default || path.sep;

    /** @private */
    this.originalSIGINTListeners = this.rl.listeners('SIGINT');
    /** @private */
    this.answer = (this.opt.multi) ? [] : null;
    /** @private */
    this.finished = false;
    /** @private */
    this.shell = new ShellPathAutocomplete(cwd || process.cwd(), this.opt.directoryOnly);
    /** @private */
    this.opt.default = this.shell.getWorkingDirectory().getName();
    /** @private */
    this.state = {
      selectionActive: false
    };

    this.rl.removeAllListeners('SIGINT');
  }

  /**
   * Runs the prompt.
   * @param {function} cb - A callback to call once the prompt has been answered successfully
   * @returns {PathPrompt}
   * @private
     */
  _run( cb ) {
    /** @private */
    this.done = cb;

    const submit = rx.Observable.fromEvent(this.rl, 'line')
      // Submit only if there is no active directoryChildren
      .filter(() => !this.shell.hasSelectedPath())
      .map(() => path.resolve(this.shell.getInputPathReference().getPath()));

    const validation = submit.flatMap((value) => {
      return rx.Observable.create((observer) => {
        runAsync(this.opt.validate, (isValid) => {
          observer.onNext({ isValid: isValid, value });
          observer.onCompleted();
        }, value, this.answers);
      });
    }).share();

    const success = validation
      .filter((state) => state.isValid === true)
      .takeWhile(() => !this.finished);

    const error = validation
      .filter((state) => state.isValid !== true)
      .takeUntil(success);

    success.forEach((state) => this.onSuccess(state));
    error.forEach((state) => this.onError(state));

    rx.Observable.fromEvent(this.rl, 'SIGINT', (value, key) => ({ value: value, key: key || {} }))
      .takeWhile(() => !this.finished)
      .forEach((...args) => {
        if (this.shell.hasSelectedPath()) {
          this.state.selectionActive = false;
          this.shell.resetSelectPotentialPath();
        } else if (this.opt.multi) {
          this.onFinish();
        } else {
          this.originalSIGINTListeners.forEach((listener) => listener(...args));
        }
      });

    rx.Observable.fromEvent(this.rl.input, 'keypress', (value, key) => ({ value: value, key: key || {} }))
      .takeWhile(() => !this.finished)
      // Do not trigger the key press event for a submission
      .filter((input) => input.key.name !== ENTER_KEY || this.shell.hasSelectedPath())
      // Analyze the key pressed and rerender
      .forEach((input) => this.onKeypress(input));

    this.render();
    return this;
  }

  /**
   * Handles validation errors.
   * @param state
   */
  onError(state) {
    // Keep the state
    this.rl.line = this.shell.getInputPath(true);

    this.resetCursor();
    this.renderError(state.isValid);
  }

  /**
   * Handles a successful submission.
   * @param state
   */
  onSuccess(state) {
    // Filter the value based on the options.
    this.filter(state.value, (filteredValue) => {
      // Re-render prompt with the final value
      this.render(filteredValue);

      if (this.opt.multi) {
        // Add a new line to keep the rendered answer
        this.rl.output.unmute();
        this.rl.output.write('\n');
        this.rl.output.mute();

        // Reset the shell
        this.shell.setInputPath('');
        this.shell.resetSelectPotentialPath();

        // Hide the selection if it was active
        this.state = {
          selectionActive: false
        };
        this.answer.push(filteredValue);

        // Render the new prompt
        this.render();
      } else {
        this.answer = filteredValue;
        this.onFinish();
      }
    });
  }

  /**
   * Handles the finish event
   */
  onFinish() {
    this.finished = true;
    // Put the listeners back on to SIGINT
    this.originalSIGINTListeners.forEach((listener) => {
      this.rl.addListener('SIGINT', listener);
    });

    this.screen.done();
    this.done(this.answer);
  }

  /**
   * Hanldles keyPress events.
   * @param {Object} input - The input event
   * @param {Object} input.key - The key that was pressed
   * @param {string} input.value - The key value
   */
  onKeypress(input) {
    switch (input.key.name) {
      case TAB_KEY:
        this.shell.refresh();
        if (this.shell.hasCommonPotentialPath()) {
          this.state.selectionActive = false;
          this.shell.setInputPath(this.shell.getCommonPotentialPath());
        } else if (! this.state.selectionActive) {
          this.state.selectionActive = true;
        } else {
          this.shell.selectNextPotentialPath(!input.key.shift);
        }
        this.resetCursor();
        break;
      case ENTER_KEY:
        if (this.state.selectionActive) {
          this.shell.setInputPath(this.shell.getSelectedPath());
          this.state.selectionActive = false;
        }
        this.resetCursor();
        break;
      default:
        this.state.selectionActive = false;
        this.shell.setInputPath(this.rl.line);
        break;
    }
    // Avoid polluting the line value with whatever new characters the action key added to the line
    this.rl.line = this.shell.getInputPath(true);
    this.render();
  }

  /**
   * Render the prompt
   */
  render(finalAnswer) {
    const message = this.renderMessage(finalAnswer);
    const bottom = finalAnswer ? '' : this.renderBottom();
    this.screen.render(message, bottom);
  }

  /**
   * Render errors during the prompt
   * @param error
   */
  renderError(error) {
    this.screen.render(this.renderMessage(), chalk.red('>> ') + error);
  }

  /**
   * Reset the input cursor to the end of the line
   */
  resetCursor() {
    // Move the display cursor
    this.rl.output.unmute();
    readline.cursorTo(this.rl.output, this.shell.getInputPath(true).length + 1);
    this.rl.output.mute();
    // Move the internal cursor
    this.rl.cursor = this.shell.getInputPath(true).length + 1;
  }

  /**
   * Render the message part of the prompt. The message includes the question and the current response.
   * @returns {String}
   */
  renderMessage(finalAnswer) {
    let message = this.getQuestion();
    if (finalAnswer) {
      message += chalk.cyan(finalAnswer);
    } else {
      message += this.shell.getInputPath(true);
    }
    return message;
  }

  /**
   * Render the bottom part of the prompt. The bottom part contains all the possible paths.
   * @returns {string}
   */
  renderBottom() {
    if (!this.state.selectionActive) {
      return '';
    }
    const potentialPaths = this.shell.getPotentialPaths();
    const selectedPath = this.shell.getSelectedPath();
    const selectedPathIndex = potentialPaths.indexOf(selectedPath);

    return this.slice(potentialPaths, selectedPathIndex, RANGE_SIZE)
      .map((potentialPath) => {
        const suffix = (potentialPath.isDirectory() ? path.sep : '');
        if (potentialPath === selectedPath) {
          return chalk.black.bgWhite(potentialPath.getName() + suffix);
        }
        return (potentialPath.isDirectory() ? chalk.red : chalk.green)(potentialPath.getName()) + suffix;
      })
      .join('\n');
  }

  /**
   * Slice an array around a specific item so that it contains a specific number of elements.
   * @param {Array<T>} items - The array of items which should be shortened
   * @param itemIndex - The index of the item that should be included in the returned slice
   * @param size - The desired size of the array to be returned
   * @returns {Array<T>} An array with the number of elements specified by size.
     */
  slice(items, itemIndex, size) {
    const length = items.length;
    let min = itemIndex - Math.floor(size / 2);
    let max = itemIndex + Math.ceil(size / 2);
    if (min < 0) {
      max = Math.min(length, max - min);
      min = 0;
    } else if (max >= length) {
      min = Math.max(0, min - (max - length));
      max = length;
    }
    return items.slice(min, max);
  }
}

inquirer.prompt.registerPrompt('path', PathPrompt);
