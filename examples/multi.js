const fs = require('fs');
const inquirer = require('inquirer');
const PathPrompt = require('../lib').PathPrompt;

inquirer.registerPrompt('path', PathPrompt);

function exists(path) {
  try {
    fs.accessSync(path, fs.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

const questions = [{
  type: 'path',
  name: 'path',
  message: 'Enter a path',
  default: process.cwd(),
  multi: true,
  validate: (answer, answers, paths) => {
    if (typeof answer === 'string') {
      if (paths.indexOf(answer) !== -1) {
        return 'The path has already been selected';
      } else if (!exists(answer)) {
        return 'The path does not exist';
      }
      return true;
    }
    return answer.length > 0 ? true : 'You must provide at least one path';
  },
}];

inquirer.prompt(questions)
  .then(result => console.log(result.path))
  .catch(err => console.error(err.stack));
