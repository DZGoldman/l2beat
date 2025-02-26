/*
  This file is a quick prototype and will be refactored if it's proven useful.
  
  Do not INCLUDE this file - it immediately runs `updateDiffHistoryFile()`
*/

import { ConfigReader, diffDiscovery, DiscoveryDiff } from '@l2beat/discovery'
// eslint-disable-next-line import/no-extraneous-dependencies
import { DiscoveryOutput } from '@l2beat/discovery-types'
import { ChainId } from '@l2beat/shared-pure'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { toUpper } from 'lodash'

// This is a CLI tool. Run logic immediately.
void updateDiffHistoryFile()

async function updateDiffHistoryFile() {
  console.log('Updating diff history file...')
  const params = process.argv.filter((v) => !v.startsWith('-'))
  console.log(params)
  const chainName = params[2]
  const projectName = params[3]
  if (!chainName || !projectName) {
    console.error('Pass parameters: <chainName> <projectName>')
    process.exit(1)
  }
  const chainId = ChainId.fromName(chainName)

  console.log(`Project: ${projectName}`)
  const configReader = new ConfigReader()
  const curDiscovery = await configReader.readDiscovery(projectName, chainId)
  const config = await configReader.readConfig(projectName, chainId)
  const discoveryFolder = `./discovery/${projectName}/${chainName}`
  const { content: DiscoveryJsonFromMainBranch, mainBranchHash } =
    getFileVersionOnMainBranch(`${discoveryFolder}/discovered.json`)
  const discoveryFromMainBranch =
    DiscoveryJsonFromMainBranch === ''
      ? { contracts: [] }
      : (JSON.parse(DiscoveryJsonFromMainBranch) as DiscoveryOutput)
  const diff = diffDiscovery(
    discoveryFromMainBranch.contracts,
    curDiscovery.contracts,
    config,
  )

  if (diff.length > 0) {
    const newHistoryEntry = generateDiffHistoryMarkdown(diff, mainBranchHash)
    const diffHistoryPath = `${discoveryFolder}/diffHistory.md`
    const { content: historyFileFromMainBranch } =
      getFileVersionOnMainBranch(diffHistoryPath)
    const diffHistory =
      historyFileFromMainBranch === ''
        ? newHistoryEntry
        : newHistoryEntry.concat('\n' + historyFileFromMainBranch)
    writeFileSync(diffHistoryPath, diffHistory)
  } else {
    console.log('No changes found')
  }
}

function getMainBranchName(): 'main' | 'master' {
  try {
    if (execSync('git show-ref --verify refs/heads/master').toString().trim()) {
      return 'master'
    }
  } catch (error) {
    // If error, it means 'master' doesn't exist, so we'll stick with 'main'
  }
  return 'main'
}

function getFileVersionOnMainBranch(filePath: string): {
  content: string
  mainBranchHash: string
} {
  const mainBranch = getMainBranchName()
  try {
    const content = execSync(
      `git show ${mainBranch}:${filePath} 2>/dev/null`,
    ).toString()
    const mainBranchHash = execSync(`git rev-parse ${mainBranch}`)
      .toString()
      .trim()
    return {
      content,
      mainBranchHash,
    }
  } catch (e) {
    console.log(`No previous version of ${filePath} found`)
    return {
      content: '',
      mainBranchHash: '',
    }
  }
}

function getGitUser(): { name: string; email: string } {
  try {
    const name = execSync('git config user.name').toString().trim()
    const email = execSync('git config user.email').toString().trim()
    return { name, email }
  } catch (e) {
    console.log('No git user found')
    return { name: 'unknown', email: 'unknown' }
  }
}

function contractDiffToMarkdown(diff: DiscoveryDiff): string {
  const result = []
  result.push('```diff')
  if (diff.type) {
    const marker = diff.type === 'created' ? '+' : '-'
    result.push(`${marker}   Status: ${toUpper(diff.type)}`)
  }
  result.push(`    contract ${diff.name} (${diff.address.toString()}) {`)
  if (diff.diff) {
    for (const valueDiff of diff.diff) {
      const varName = valueDiff.key ?? 'unknown'
      result.push(`      ${varName}:`)
      if (valueDiff.before) {
        result.push(`-        ${valueDiff.before}`)
      }
      if (valueDiff.after) {
        result.push(`+        ${valueDiff.after}`)
      }
    }
  }
  result.push('    }')
  result.push('```')
  return result.join('\n')
}

function discoveryDiffToMarkdown(diffs: DiscoveryDiff[]): string {
  const result = []
  for (const diff of diffs) {
    result.push(contractDiffToMarkdown(diff))
  }
  return result.join('\n\n')
}

function generateDiffHistoryMarkdown(
  diffs: DiscoveryDiff[],
  mainBranchHash: string,
): string {
  const result = []
  const mainBranch = getMainBranchName()

  const now = new Date().toUTCString()
  result.push(`## Diff at ${now}:`)
  result.push('')
  const { name, email } = getGitUser()
  result.push(`- author: ${name} (<${email}>)`)
  result.push(`- comparing to: ${mainBranch}@${mainBranchHash}`)
  result.push('')
  result.push(discoveryDiffToMarkdown(diffs))
  result.push('')

  return result.join('\n')
}
