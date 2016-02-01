require('./transpile');

const path = require('path');
const inquirer = require('inquirer');

const paths = require('../src/');

const questions = [{
  type: 'path',
  name: 'path',
  message: 'Enter a path',
  multi: true,
  default: process.cwd()
}];

inquirer.prompt(questions, function(result) {
  console.log(result.path);
  doPrompt();
});
