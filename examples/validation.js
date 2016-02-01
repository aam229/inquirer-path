require('./transpile');

const path = require('path');
const inquirer = require('inquirer');

const paths = require('../src/');
const helpers = require('../src/PathReference');

const questions = [{
  type: 'path',
  name: 'path',
  message: 'Enter a path',
  directoryOnly: false,
  default: process.cwd(),
  validate: function(path) {
    if(!helpers.exists(path)){
      return "The selected path does not exist";
    }else{
      return true;
    }
  }
}];

inquirer.prompt(questions, function(result) {
  console.log(result.path);
});