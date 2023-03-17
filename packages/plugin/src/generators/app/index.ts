import validatePackageName from 'validate-npm-package-name';
import Generator from 'yeoman-generator';

type Answers = {
    projectName: string;
    dirName: string;
};

export default class AppGenerator extends Generator {
    answers: Answers | undefined;

    async prompting() {
        const prompts: Generator.Questions = [
            {
                type: 'input',
                name: 'projectName',
                message: 'Enter project name:',
                validate: (name: string) => {
                    const result = validatePackageName(name);

                    if (result.validForNewPackages) {
                        return true;
                    }

                    return result.errors?.[0] ?? result.warnings?.[0] ?? 'invalid name';
                },
            },
            {
                type: 'input',
                name: 'dirName',
                message: 'Enter project directory:',
                default: (responses: Partial<Answers>) => responses.projectName?.split('/').pop() ?? '',
            },
        ];

        this.answers = await this.prompt<Answers>(prompts);
    }

    writing() {
        if (!this.answers) {
            throw new Error('no answers collected');
        }

        this.destinationRoot(this.answers.dirName);
        this.env.cwd = this.answers.dirName;

        this.fs.copyTpl(this.templatePath('**'), this.destinationPath(), this.answers, undefined, {
            globOptions: { dot: true },
        });
    }
}
