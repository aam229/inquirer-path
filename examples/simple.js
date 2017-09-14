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

const questions = [
  {
    type: 'rawlist',
    name: 'list',
    message: 'Pick an option',
    choices: ['hello', 'world'],
  },
  {
    type: 'path',
    name: 'path',
    message: 'Enter a path',
    default: process.cwd(),
    validate: answer => exists(answer) ? true : 'The path does not exist',
  },
  {
    type: 'confirm',
    name: 'conf1',
    message: 'Confirm once',
  },
  {
    type: 'confirm',
    name: 'conf2',
    message: 'Confirm twice',
  }
];

inquirer.prompt(questions)
  .then(result => console.log(result.path))
  .catch(err => console.error(err.stack));
