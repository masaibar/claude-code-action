import * as core from "@actions/core";
import type { ParsedGitHubContext } from "../context";
import type { Octokit } from "@octokit/rest";

/**
 * Check if the actor has write permissions to the repository
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @param isUsingPAT - Whether a Personal Access Token is being used
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
  isUsingPAT: boolean = false,
): Promise<boolean> {
  const { repository, actor } = context;
  let usernameToCheck = actor;

  try {
    // PATを使用している場合は、認証ユーザーの権限をチェック
    if (isUsingPAT) {
      core.info(`Using PAT authentication, checking authenticated user's permissions`);
      try {
        const { data: user } = await octokit.users.getAuthenticated();
        usernameToCheck = user.login;
        core.info(`Authenticated user: ${usernameToCheck}`);
      } catch (error) {
        core.warning(`Failed to get authenticated user, falling back to actor: ${error}`);
      }
    }

    core.info(`Checking permissions for user: ${usernameToCheck}`);

    // Check permissions directly using the permission endpoint
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: usernameToCheck,
    });

    const permissionLevel = response.data.permission;
    core.info(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      core.info(`User has write access: ${permissionLevel}`);
      return true;
    } else {
      core.warning(`User has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    core.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${usernameToCheck}: ${error}`);
  }
}
