import * as Generator from 'yeoman-generator';

export default class AppGenerator extends Generator {
    answers: {
        projectName: string;
        dirName: string;
    };

    async prompting() {
        const prompts = [
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter project name:',
            },
            {
                type: 'input',
                name: 'dirName',
                message: 'Enter project directory:',
            },
        ];

        this.answers = await this.prompt(prompts);
    }

    writing() {
        this.destinationRoot(this.answers.dirName);
        this.env.cwd = this.answers.dirName;

        this.fs.copyTpl(this.templatePath('**'), this.destinationPath(), this.answers, undefined, {
            globOptions: { dot: true },
        });
    }
}
