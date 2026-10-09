// @storybook/test-runner derives jest's rootDir from @storybook/core-common's
// getProjectRoot(), which walks up looking for a VCS directory (.git/.hg/.svn/.yarn).
// A freshly generated plugin project is not a git repo, so that walk runs past the
// project and lands on the user's home directory: `npm run test-storybook` then builds a
// jest-haste-map over every file under $HOME, prints dozens of "Haste module naming
// collision" warnings, and appears to hang for many minutes before reaching any story.
//
// Pinning rootDir and roots keeps the run inside this project. Running `git init` here
// would also fix it; this file works either way, including before the first commit.
const { getJestConfig } = require('@storybook/test-runner');

module.exports = {
    ...getJestConfig(),
    rootDir: __dirname,
    roots: [__dirname],
    modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/storybook-static/', '<rootDir>/target/'],
};
