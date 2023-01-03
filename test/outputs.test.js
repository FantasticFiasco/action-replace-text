// @actions/core
const mockCore = {
    setOutput: jest.fn(),
}
jest.mock('@actions/core', () => {
    return mockCore
})

const outputs = require('../src/outputs')

describe('#set should', () => {
    test('correctly set all outputs', () => {
        const currentYear = 2023
        const branchName = 'some-branch-name'
        const pullRequestNumber = 42
        const pullRequestUrl = 'https://github.com/some-user/some-repo/pull/42'
        outputs.set(currentYear, branchName, pullRequestNumber, pullRequestUrl)
        expect(mockCore.setOutput).toHaveBeenCalledWith('currentYear', currentYear)
        expect(mockCore.setOutput).toHaveBeenCalledWith('branchName', branchName)
        expect(mockCore.setOutput).toHaveBeenCalledWith('pullRequestNumber', pullRequestNumber)
        expect(mockCore.setOutput).toHaveBeenCalledWith('pullRequestUrl', pullRequestUrl)
    })
})
