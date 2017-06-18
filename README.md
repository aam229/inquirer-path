# Inpuirer Path

This project provides a `path` prompt for the [Inquirer](https://github.com/SBoudrias/Inquirer.js/) module. It allows the user to pick a path using a similar interface as [zsh](http://www.zsh.org/).
 
## Usage

Install the module using `npm install inquirer-path`.

Create a question just as you would with any other Inquirer [question types](https://github.com/SBoudrias/Inquirer.js/#question). Once included, the module registers itself with the resolved `inquirer` instance. If you want to register it under another question type or if you are using a different inquirer instance, you should include:

```js
import { PathPrompt } from 'inquirer-path';
inquirer.prompt.registerPrompt('path', PathPrompt);
```

### Multi Path

If the question's `multi` property is set to true, the prompt will indefinitely ask for more paths. In order to finalize the answer, the user must either send a SIGINT or hit the escape key. The last answer is discarded when the user exits the prompt

## Config

The path question supports the following options:

- **type**: (String) Type of the prompt. Should be set to `path` in order to use this module.
- **name**: (String) The name to use when storing the answer in the answers hash.
- **cwd**: (String) The current working directory for the path prompt. If the input path is relative, it is resolved from the provided **cwd**. It must be a path to an existing local folder. If none is provided, it defaults to the system's root directory.
- **default**: (String) Save as the **cwd** option.
- **multi**: (Boolean) Set to true if the prompt should ask for multiple paths. If multi is set to true, the path entry can be stopped by sending the `SIGINT` signal (ctrl+C) 
- **directoryOnly**: (Boolean) Set to true if the prompt should only autocomplete (or suggest) directories.
- **validate**: (Function) Receive the user input and should return true if the value is valid, and an error message (String) otherwise. If false is returned, a default error message is provided. If **multi** is true, it is called for each path entered by the user as well as once the prompt finishes.
- **filter**: (Function) Receive the user input and return the filtered value to be used inside the program. The value returned will be added to the Answers hash.
- **when**: (Function, Boolean) Receive the current user answers hash and should return true or false depending on whether or not this question should be asked. The value can also be a simple boolean.

## Example

```js
import inquirer from ('inquirer');
import { PathPrompt } from 'inquirer-path';

const questions = [{
  type: 'path',
  name: 'path',
  message: 'Enter a path',
  default: process.cwd(),
}];

inquirer.registerPrompt('path', PathPrompt);
inquirer.prompt(questions)
  .then((result) => console.log(result.path));
```

You can see additional examples in the [examples](./examples) folder.

## Development

The API documentation can be found [here](./DOCUMENTATION.md)

This project defines the following `npm` scripts to help you during development:

- `compile` - Compile the code in `./src` and output it into `./lib`
- `compile-watch` - Watch the `./src` folder. When a change occurs, the code is recompiled and the docs are regenerated.
- `lint` - Run eslint to validate the code formatting
- `fix-lint` - Fix the simple eslint error
- `docs` - Generate the html documentation to `./docs` 
- `docs-watch` - Create a documentation server at localhost:4001
- `docs-md` - Generate the DOCUMENTATION.md file 

### Debugging

This project is a real pain to debug. Using `console.log` messes up the UI (and is often overriden by it) and the [Webstorm](https://www.jetbrains.com/webstorm/) debugger does not play nice with user input. The best way I have found so far is to use `console.error` and redirect the error stream to a file. I have one terminal in which I run `node yourscript.js 2> debug.txt` and another in which I observe the output using `tail -f debug.txt`. I'm definitely opened to better suggestions.



