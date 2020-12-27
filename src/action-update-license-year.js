const { setFailed, info } = require('@actions/core');
const { context } = require('@actions/github');
const { parseInput } = require('./inputs');
const { applyTransform } = require('./transforms');
const { Repository } = require('./Repository');
const { search } = require('./search');

async function run() {
    try {
        const wd = process.env.GITHUB_WORKSPACE;
        if (wd === undefined) {
            throw new Error('GitHub Actions has not set the working directory');
        }
        info(`Working directory: ${wd}`);

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
        await repo.authenticate();

        const branchExists = await repo.branchExists(branchName);
        info(`Checkout ${branchExists ? 'existing' : 'new'} branch named "${branchName}"`);
        await repo.checkoutBranch(branchName, !branchExists);

        const files = await search(path);
        if (files.length === 0) {
            throw new Error(`Found no files matching the path "${path}"`);
        }

        info(`Found ${files.length} file(s) matching the path "${path}"`);

        const currentYear = new Date().getFullYear();
        info(`Current year is "${currentYear}"`);

        for (const file of files) {
            const content = await repo.readFile(file);
            const updatedContent = applyTransform(transform, content, currentYear);
            if (updatedContent !== content) {
                info(`Update license in "${file.replace(wd, '.')}"`);
                await repo.writeFile(file, updatedContent);
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
