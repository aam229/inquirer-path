require('./transpile');

const path = require('path');
const inquirer = require('inquirer');

const paths = require('../src/');
const PathReference = require('../src/PathReference');

const questions = [{
  type: 'path',
  name: 'path',
  message: 'Enter a path',
  default: process.cwd(),
  multi: true,
  validate: function(answser) {
    return PathReference.exists(answser) ? true : "The path does not exist";
  },
  validateMulti: function(answers){
    return answers.length > 0 ? true : "You must provide at least one path"
  }
}];

inquirer.prompt(questions, function(result) {
  console.log(result.path);
});
