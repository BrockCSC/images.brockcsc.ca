#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const DEFAULT_PUBLIC_BASE_URL = 'https://images.brockcsc.ca';

function printUsage() {
  console.error(
    'Usage: node scripts/import-image.js <source-file> [--date YYYY-MM-DD] [--root <path>] [--commit]'
  );
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    commit: false,
    date: null,
    root: process.cwd(),
    sourceFile: null,
  };

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === '--date') {
      const value = args.shift();
      if (!value) {
        fail('Missing value for --date.');
      }
      options.date = value;
      continue;
    }

    if (arg === '--root') {
      const value = args.shift();
      if (!value) {
        fail('Missing value for --root.');
      }
      options.root = value;
      continue;
    }

    if (arg === '--commit') {
      options.commit = true;
      continue;
    }

    if (arg.startsWith('--')) {
      fail(`Unknown option: ${arg}`);
    }

    if (options.sourceFile) {
      fail('Only one source file can be provided.');
    }

    options.sourceFile = arg;
  }

  if (!options.sourceFile) {
    printUsage();
    fail('Source file is required.');
  }

  return options;
}

function parseDateParts(dateInput) {
  if (!dateInput) {
    const today = new Date();
    return {
      year: String(today.getFullYear()),
      month: String(today.getMonth() + 1),
      day: String(today.getDate()),
    };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
  if (!match) {
    fail('Date must use YYYY-MM-DD format.');
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    fail(`Invalid date: ${dateInput}`);
  }

  return {
    year: String(year),
    month: String(month),
    day: String(day),
  };
}

async function ensureSourceFile(sourceFilePath) {
  let stats;
  try {
    stats = await fs.stat(sourceFilePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      fail(`Source file does not exist: ${sourceFilePath}`);
    }
    fail(`Unable to read source file: ${error.message}`);
  }

  if (!stats.isFile()) {
    fail(`Source path is not a file: ${sourceFilePath}`);
  }
}

async function runGit(rootPath, args) {
  try {
    return await execFileAsync('git', ['-C', rootPath, ...args], {
      windowsHide: true,
    });
  } catch (error) {
    const stderr = error.stderr ? error.stderr.trim() : '';
    const stdout = error.stdout ? error.stdout.trim() : '';
    const details = stderr || stdout || error.message;
    fail(`Git command failed (${args.join(' ')}): ${details}`);
  }
}

async function commitAndPush(rootPath, relativeOutputPath) {
  await runGit(rootPath, ['rev-parse', '--is-inside-work-tree']);
  await runGit(rootPath, ['add', '--', relativeOutputPath]);
  await runGit(rootPath, ['commit', '-m', `Add image ${relativeOutputPath}`, '--', relativeOutputPath]);
  await runGit(rootPath, ['push']);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootPath = path.resolve(options.root);
  const sourceFilePath = path.resolve(options.sourceFile);

  await ensureSourceFile(sourceFilePath);

  const dateParts = parseDateParts(options.date);
  const generatedId = crypto.randomUUID();
  const sourceFileName = path.basename(sourceFilePath);

  const destinationDirectory = path.join(
    rootPath,
    dateParts.year,
    dateParts.month,
    dateParts.day,
    generatedId
  );
  const destinationFilePath = path.join(destinationDirectory, sourceFileName);

  try {
    await fs.mkdir(destinationDirectory, { recursive: true });
    await fs.copyFile(sourceFilePath, destinationFilePath);
  } catch (error) {
    fail(`Unable to copy file: ${error.message}`);
  }

  const relativeOutputPath = path
    .relative(rootPath, destinationFilePath)
    .split(path.sep)
    .join('/');

  if (options.commit) {
    await commitAndPush(rootPath, relativeOutputPath);
  }

  const publicUrl = `${DEFAULT_PUBLIC_BASE_URL}/${relativeOutputPath}`;

  process.stdout.write(`${relativeOutputPath}\n`);
  process.stdout.write(`${publicUrl}\n`);
}

main();
