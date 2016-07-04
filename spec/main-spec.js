'use babel';

import target from '../lib/main';

describe('main', () => {
    let result;
    let workspaceElement;

    // TODO: Add rewire to mock console.log

    beforeEach(() => {
        let activationPromise = atom.packages.activatePackage('angular-jasmine-boilerplate-atom');

        workspaceElement = atom.views.getView(atom.workspace);

        waitsForPromise(() => {
            return activationPromise;
        });
    });

    /**
     * generate
     */

    describe('When generating boilerplate', () => {
        let fileSpy;

        beforeEach(() => {
            spyOn(atom, 'confirm');
            spyOn(atom.notifications, 'addError');
            spyOn(atom.workspace, 'getActivePaneItem');
            spyOn(atom.workspace, 'open');

            spyOn(target, 'getProjectConfig');
            target.getProjectConfig.andCallFake((directory, key) => {
                return key;
            });

            spyOn(target, 'getProjectDirectory');
            target.getProjectDirectory.andReturn('PROJECT DIRECTORY');

            spyOn(target, 'openFiles');
            spyOn(target, 'runCommand');

            fileSpy = jasmine.createSpyObj('editor.buffer.file', ['getPath']);
            fileSpy.getPath.andReturn('PATH');

            atom.workspace.getActivePaneItem.andReturn({
                buffer: {
                    file: fileSpy
                }
            });
        });

        describe('and a file is not open', () => {
            beforeEach(() => {
                atom.workspace.getActivePaneItem.andReturn(undefined);

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            it('should not generate the boilerplate', () => {
                expect(target.runCommand).not.toHaveBeenCalled();
            });
        });

        describe('and the file does not exist within the project directory', () => {
            beforeEach(() => {
                target.getProjectDirectory.andReturn(null);

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            it('should get project directory', () => {
                expect(target.getProjectDirectory).toHaveBeenCalledWith('PATH');
            });

            it('should add error notification', () => {
                expect(atom.notifications.addError).toHaveBeenCalled();
            });

            it('should not generate the boilerplate', () => {
                expect(target.runCommand).not.toHaveBeenCalled();
            });
        });

        describe('and the base path is not defined', () => {
            beforeEach(() => {
                target.getProjectConfig.andReturn(false);

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            it('should get base path', () => {
                expect(target.getProjectConfig).toHaveBeenCalledWith(
                    'PROJECT DIRECTORY',
                    'basePath'
                );
            });

            it('should get test path', () => {
                expect(target.getProjectConfig).toHaveBeenCalledWith(
                    'PROJECT DIRECTORY',
                    'testPath'
                );
            });

            it('should not generate the boilerplate', () => {
                expect(target.runCommand).not.toHaveBeenCalled();
            });
        });

        describe('and an unexpected error occurs', () => {
            beforeEach(() => {
                target.runCommand.andThrow('Exception!');

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            it('should add error notification', () => {
                expect(atom.notifications.addError).toHaveBeenCalled();
            });
        });

        describe('and the file does not exist', () => {
            beforeEach(() => {
                target.runCommand.andReturn(
                    [
                        '',
                        'file1',
                        'file2',
                    ]
                );

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            it('should generate boilerplate', () => {
                expect(target.runCommand).toHaveBeenCalledWith(
                    'basePath',
                    'testPath',
                    'PATH'
                );
            });

            it('should open generated files', () => {
                expect(target.openFiles).toHaveBeenCalledWith(
                    'testPath',
                    [
                        '',
                        'file1',
                        'file2',
                    ]
                );
            });
        });

        describe('and the file already exists', () => {
            beforeEach(() => {
                target.runCommand.andReturn(
                    [
                        'already exists'
                    ]
                );

                atom.commands.dispatch(workspaceElement, 'angular-jasmine-boilerplate:generate');
            });

            describe('and the overwrite is confirmed', () => {
                beforeEach(() => {
                    atom.confirm.calls[0].args[0].buttons.Overwrite();
                });

                it('should overwrite file', () => {
                    expect(target.runCommand).toHaveBeenCalledWith(
                        'basePath',
                        'testPath',
                        'PATH',
                        true
                    );
                });

                it('should open files', () => {
                    expect(target.openFiles).toHaveBeenCalledWith(
                        'testPath',
                        [
                            'already exists'
                        ]
                    );
                });
            });

            describe('and the dialog is cancelled', () => {
                beforeEach(() => {
                    atom.confirm.calls[0].args[0].buttons.Cancel();
                });

                it('should do nothing', () => {
                    expect(target.runCommand.calls.length).toEqual(1);
                    expect(atom.workspace.open).not.toHaveBeenCalled();
                });
            });
        });
    });

    /**
     * openFiles
     */

    describe('When processing output', () => {
        beforeEach(() => {
            spyOn(atom.workspace, 'open');

            target.openFiles('test', ['', '1', '2']);
        });

        it('should open files', () => {
            expect(atom.workspace.open.calls.length).toEqual(2);
            expect(atom.workspace.open).toHaveBeenCalledWith('test/1');
            expect(atom.workspace.open).toHaveBeenCalledWith('test/2');
        });
    });

    /**
     * setSourceFolder
     */

    describe('When setting the source folder', () => {
        beforeEach(() => {
            spyOn(target, 'setFolder');

            target.setSourceFolder();
        });

        it('should set the source folder', () => {
            expect(target.setFolder).toHaveBeenCalledWith('base');
        });
    });

    /**
     * setTestFolder
     */

    describe('When setting the test folder', () => {
        beforeEach(() => {
            spyOn(target, 'setFolder');

            target.setTestFolder();
        });

        it('should set the test folder', () => {
            expect(target.setFolder).toHaveBeenCalledWith('test');
        });
    });

    /**
     * setFolder
     */

    describe('When setting a folder', () => {
        let projectDirectoryMock;

        beforeEach(() => {
            spyOn(atom, 'pickFolder');
            spyOn(atom.notifications, 'addError');
            spyOn(atom.notifications, 'addSuccess');

            spyOn(target, 'getProjectDirectory');
            spyOn(target, 'setProjectConfig');

            projectDirectoryMock = jasmine.createSpyObj('Directory', ['getPath']);
            projectDirectoryMock.getPath.andReturn('path');
        });

        describe('and nothing is selected', () => {
            beforeEach(() => {
                target.setFolder('type');

                atom.pickFolder.calls[0].args[0](null);
            });

            it('should do nothing', () => {
                expect(target.setProjectConfig).not.toHaveBeenCalled();
            });
        });

        describe('and multiple folders are selected', () => {
            beforeEach(() => {
                target.setFolder('type');

                atom.pickFolder.calls[0].args[0](
                    [
                        1,
                        2
                    ]
                );
            });

            it('should add error notification', () => {
                expect(atom.notifications.addError).toHaveBeenCalled();
            });
        });

        describe('and the folder is not within the project directory', () => {
            beforeEach(() => {
                target.setFolder('type');

                target.getProjectDirectory.andReturn(false);

                atom.pickFolder.calls[0].args[0](
                    [
                        'folderPath'
                    ]
                );
            });

            it('should get project directory', () => {
                expect(target.getProjectDirectory).toHaveBeenCalledWith('folderPath');
            });

            it('should add error notification', () => {
                expect(atom.notifications.addError).toHaveBeenCalled();
            });
        });

        describe('successfully', () => {
            beforeEach(() => {
                target.setFolder('type');

                target.getProjectDirectory.andReturn(projectDirectoryMock);

                target.setProjectConfig.andReturn(true);

                atom.pickFolder.calls[0].args[0](
                    [
                        'folderPath'
                    ]
                );
            });

            it('should set project config', () => {
                expect(target.setProjectConfig).toHaveBeenCalledWith(
                    projectDirectoryMock,
                    'typePath',
                    'folderPath'
                );
            });

            it('should add success notification', () => {
                expect(atom.notifications.addSuccess).toHaveBeenCalled();
            });
        });

        describe('unsuccessfully', () => {
            beforeEach(() => {
                target.setFolder('type');

                target.getProjectDirectory.andReturn(projectDirectoryMock);

                target.setProjectConfig.andReturn(false);

                atom.pickFolder.calls[0].args[0](
                    [
                        'folderPath'
                    ]
                );
            });

            it('should add error notification', () => {
                expect(atom.notifications.addError).toHaveBeenCalled();
            });
        });
    });

    /**
     * setProjectConfig
     */

    describe('When setting the project config', () => {
        beforeEach(() => {
            spyOn(atom.config, 'set');

            spyOn(target, 'getProjectConfigKey');
            target.getProjectConfigKey.andReturn('configKey');

            target.setProjectConfig('dir', 'key', 'value');
        });

        it('should get project config key', () => {
            expect(target.getProjectConfigKey).toHaveBeenCalledWith('dir', 'key');
        });

        it('should set config', () => {
            expect(atom.config.set).toHaveBeenCalledWith('configKey', 'value');
        });
    });

    /**
     * getProjectConfig
     */

    describe('When getting the project config', () => {
        beforeEach(() => {
            spyOn(atom.config, 'get');

            spyOn(target, 'getProjectConfigKey');
            target.getProjectConfigKey.andReturn('configKey');

            target.getProjectConfig('dir', 'key');
        });

        it('should get project config key', () => {
            expect(target.getProjectConfigKey).toHaveBeenCalledWith('dir', 'key');
        });

        it('should get config', () => {
            expect(atom.config.get).toHaveBeenCalledWith('configKey');
        });
    });

    /**
     * getProjectConfigKey
     */

    describe('When getting the project config key', () => {
        let result;

        beforeEach(() => {
            const directory = jasmine.createSpyObj('directory', ['getPath']);
            directory.getPath.andReturn('path');

            result = target.getProjectConfigKey(directory, 'key');
        });

        it('should return result', () => {
            expect(result).toEqual('angular-jasmine-boilerplate-atom.project.path.key');
        });
    });

    /**
     * getProjectDirectory
     */

    describe('When getting the project directory', () => {
        let directory1;
        let directory2;
        let directory3;
        let result;

        beforeEach(() => {
            spyOn(atom.project, 'getDirectories');

            directory1 = jasmine.createSpyObj('directory1', ['contains']);
            directory1.contains.andReturn(false);

            directory2 = jasmine.createSpyObj('directory2', ['contains']);
            directory2.contains.andReturn(true);

            directory3 = jasmine.createSpyObj('directory3', ['contains']);
            directory3.contains.andReturn(false);
        });

        describe('and the directory exists', () => {
            beforeEach(() => {
                atom.project.getDirectories.andReturn(
                    [
                        directory1,
                        directory2,
                        directory3
                    ]
                );

                result = target.getProjectDirectory('my-path');
            });

            it('should return directory', () => {
                expect(result).toEqual(directory2);
            });
        });

        describe('and the directory does not exists', () => {
            beforeEach(() => {
                atom.project.getDirectories.andReturn(
                    [
                        directory1,
                        directory3
                    ]
                );

                result = target.getProjectDirectory('my-path');
            });

            it('should return null', () => {
                expect(result).toEqual(null);
            });
        });
    });
});
