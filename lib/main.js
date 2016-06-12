'use babel';

import { CompositeDisposable } from 'atom';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

export default {

    config: {
        project: {
            type: 'object',
            default: {}
        }
    },
    subscriptions: null,

    /**
     * @description Initializes the package
     */
    activate() {
        this.subscriptions = new CompositeDisposable();

        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'angular-jasmine-boilerplate:generate': () => this.generate(),
            'angular-jasmine-boilerplate:set-source-folder': () => this.setSourceFolder(),
            'angular-jasmine-boilerplate:set-test-folder': () => this.setTestFolder()
        }));
    },

    /**
     * @description Cleans up data when the window shuts down
     */
    deactivate() {
        this.subscriptions.dispose();
    },

    /**
     * @description Generates Jasmine boilerplate for the active panel item
     * @return {Boolean}
     */
    generate() {
        const editor = atom.workspace.getActivePaneItem();

        if (!editor || !editor.buffer || !editor.buffer.file) {
            return false;
        }

        const filePath = editor.buffer.file.getPath();
        const projectDirectory = this.getProjectDirectory(filePath);

        const basePath = this.getProjectConfig(projectDirectory, 'basePath');
        const testPath = this.getProjectConfig(projectDirectory, 'testPath');

        if (!basePath || !testPath) {
            atom.notifications.addError('This project has not been configured for Jasmine boilerplate generation.');
            return false;
        }

        const output = spawnSync(
            resolve(
                __dirname,
                '../node_modules/angular-jasmine-boilerplate/bin/generate.js'
            ),
            [
                `--base-path=${basePath}`,
                `--test-path=${testPath}`,
                '--non-interactive',
                filePath
            ]
        );

        console.log(`stdout: ${output.stdout}`);
        console.log(`stderr: ${output.stderr}`);

        return Boolean(output.status);
    },

    /**
     * @description Sets the source folder
     */
    setSourceFolder() {
        return this.setFolder('base');
    },

    /**
     * @description Sets the test folder
     */
    setTestFolder() {
        return this.setFolder('test');
    },

    /**
     * @description Sets the folder with the specified type
     * @param {String} type Folder type
     */
    setFolder(type) {
        atom.pickFolder((paths) => {
            let projectDirectory;

            if (paths === null) {
                return false;
            }

            if (paths.length > 1) {
                atom.notifications.addError(`You can only select one ${type} folder.`);
                return false;
            }

            projectDirectory = this.getProjectDirectory(paths[0]);

            if (!projectDirectory) {
                atom.notifications.addError(`Selected ${type} folder was not within a project directory.`);
                return false;
            }

            const result = this.setProjectConfig(
                projectDirectory,
                `${type}Path`,
                paths[0]
            );

            if (result) {
                atom.notifications.addSuccess(
                    `${type.charAt(0).toUpperCase() + type.slice(1)} folder "${paths[0].substr(projectDirectory.getPath().length)}" set successfully.`
                );
            } else {
                atom.notifications.addError(`Unable to set ${type} folder.`);
            }
        });
    },

    /**
     * @description Sets the project configuration value for the specified directory
     * @param {Directory} directory
     * @param {String} key
     * @param {*} value
     * @return {Boolean}
     */
    setProjectConfig(directory, key, value) {
        return atom.config.set(
            this.getProjectConfigKey(directory, key),
            value
        );
    },

    /**
     * @description Returns the project configuration value for the specified directory
     * @param {Directory} directory
     * @param {String} key
     * @return {*}
     */
    getProjectConfig(directory, key) {
        return atom.config.get(
            this.getProjectConfigKey(directory, key)
        );
    },

    /**
     * @description Returns the project configuration key path for the specified directory
     * @param {Directory} directory
     * @param {String} key
     * @return {String}
     */
    getProjectConfigKey(directory, key) {
        return `angular-jasmine-boilerplate-atom.project.${directory.getPath()}.${key}`;
    },

    /**
     * @description Returns the project directory that contains the specified path
     * @param {String} path
     * @return {Directory}
     */
    getProjectDirectory(path) {
        for (let directory of atom.project.getDirectories()) {
            if (directory.contains(path)) {
                return directory;
            }
        }

        return null;
    }
};
