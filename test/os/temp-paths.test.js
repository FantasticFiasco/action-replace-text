const { existsSync } = require('fs');
const { dirname, basename } = require('path');

const { tempDir, tempFile } = require('../../src/os/temp-paths');

describe('#tempDir should', () => {
    test('return an existing directory', () => {
        const got = tempDir();
        expect(got).toBeDefined();
        expect(existsSync(got)).toBeTruthy();
    });
});

describe('#tempFile should', () => {
    test('return a file name in the temp directory', () => {
        const got = tempFile('test.txt');
        expect(got).toBeDefined();
        expect(dirname(got)).toStrictEqual(tempDir());
        expect(basename(got)).toStrictEqual('test.txt');
    });
});
