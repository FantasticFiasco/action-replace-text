const { getInput, setFailed } = require('@actions/core');
const { context } = require('@actions/github');
const { updateLicense } = require('./license');
const Repository = require('./Repository');

const FILENAME = 'LICENSE';
const BRANCH_NAME = `license/copyright-to-${new Date().getFullYear()}`;

async function run() {
    try {
        const { owner, repo } = context.repo;

        // Read GitHub access token
        const token = getInput('token', { required: true });

        const repository = new Repository(owner, repo, token);

        // Branch exists?
        const hasBranch = await repository.hasBranch(BRANCH_NAME);

        // Download license
        const licenseResponse = await repository.getContent(hasBranch ? BRANCH_NAME : 'master', FILENAME);
        const license = Buffer.from(licenseResponse.data.content, 'base64').toString('ascii');

        // Update license
        const updatedLicense = updateLicense(license);

        // License updated?
        if (updatedLicense !== license) {
            // Create branch if required
            if (!hasBranch) {
                await repository.createBranch(BRANCH_NAME);
            }

            // Upload license to branch
            await repository.updateContent(BRANCH_NAME, FILENAME, licenseResponse.data.sha, updatedLicense);

            // Create PR if required
            if (!(await repository.hasPullRequest(BRANCH_NAME))) {
                await repository.createPullRequest(BRANCH_NAME);
            }
        }
    } catch (err) {
        setFailed(err.message);
    }
}

module.exports = {
    run,
};
