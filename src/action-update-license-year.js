const { setFailed, info } = require('@actions/core');
const { context } = require('@actions/github');
const { parseInput } = require('./inputs');
const { transformLicense } = require('./license');
const Repository = require('./Repository');
const { search } = require('./search');

async function run() {
    try {
        const { owner, repo: repoName } = context.repo;
        const {
            token,
            path,
            transform,
            branchName,
            commitTitle,
            commitBody,
            pullRequestTitle,
            pullRequestBody,
            assignees,
            labels,
        } = parseInput();

        const repo = new Repository(owner, repoName, token);

        const hasBranch = await repo.hasBranch(branchName);
        info(`Checkout ${hasBranch ? 'existing' : 'new'} branch named "${branchName}"`);
        await repo.checkoutBranch(branchName, !hasBranch);

        const files = await search(path);
        if (files.length === 0) {
            throw new Error(`Found no files matching the path "${path}"`);
        }

        info(`Found ${files.length} files matching the path "${path}"`);

        const currentYear = new Date().getFullYear();
        info(`Current year is "${currentYear}"`);

        for (const file in files) {
            const content = repo.readFile(file);
            const updatedContent = transformLicense(content, currentYear); // TODO: Pass transform
            if (updatedContent !== content) {
                info(`Update license in "${file}"`);
                repo.writeFile(file, updatedContent);
            } else {
                info(`File "${file}" is already up-to-date`);
            }
        }

        if (!repo.hasChanges()) {
            info(`No license where updated, let's abort`);
            return;
        }

        await repo.stageWrittenFiles();

        const commitMessage = commitBody ? `${commitTitle}\n\n${commitBody}` : commitTitle;
        await repo.commit(commitMessage);
        await repo.push();

        const hasPullRequest = await repo.hasPullRequest(branchName);
        if (!hasPullRequest) {
            info(`Create new pull request with title "${pullRequestTitle}"`);
            const createPullRequestResponse = await repo.createPullRequest(
                branchName,
                pullRequestTitle,
                pullRequestBody
            );

            if (assignees.length > 0) {
                info(`Add assignees to pull request: ${JSON.stringify(assignees)}`);
                await repo.addAssignees(createPullRequestResponse.data.number, assignees);
            }

            if (labels.length > 0) {
                info(`Add labels to pull request: ${JSON.stringify(labels)}`);
                await repo.addLabels(createPullRequestResponse.data.number, labels);
            }
        }
    } catch (err) {
        setFailed(err.message);
    }
}

module.exports = {
    run,
};
