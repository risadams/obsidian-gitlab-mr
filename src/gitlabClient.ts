import { requestUrl } from "obsidian";
import { GitlabAccount, MergeRequestInfo, MrState } from "./types";

interface GitlabMrApiResponse {
	iid: number;
	title: string;
	state: MrState;
	draft: boolean;
	work_in_progress: boolean;
	web_url: string;
	author: { username: string; avatar_url?: string };
	source_branch: string;
	target_branch: string;
	created_at: string;
	updated_at: string;
	merged_at: string | null;
	closed_at: string | null;
	upvotes: number;
	downvotes: number;
	has_conflicts: boolean;
	head_pipeline?: { status: string } | null;
}

interface GitlabApprovalsApiResponse {
	approvals_required: number;
	approvals_left: number;
}

export class GitlabApiError extends Error {
	constructor(message: string, public status?: number) {
		super(message);
		this.name = "GitlabApiError";
	}
}

export async function fetchMergeRequest(
	account: GitlabAccount,
	projectPath: string,
	iid: number
): Promise<MergeRequestInfo> {
	const encodedProject = encodeURIComponent(projectPath);
	const base = `${account.host.replace(/\/+$/, "")}/api/v4/projects/${encodedProject}/merge_requests/${iid}`;

	const headers: Record<string, string> = {};
	if (account.token) {
		headers["PRIVATE-TOKEN"] = account.token;
	}

	let mr: GitlabMrApiResponse;
	try {
		const res = await requestUrl({ url: base, headers, throw: false });
		if (res.status === 404) {
			throw new GitlabApiError(`Merge request ${projectPath}!${iid} was not found on ${account.host}.`, 404);
		}
		if (res.status === 401 || res.status === 403) {
			throw new GitlabApiError(
				`Not authorized to view ${projectPath}!${iid} on ${account.host}. Check the access token for account "${account.alias}".`,
				res.status
			);
		}
		if (res.status >= 400) {
			throw new GitlabApiError(`GitLab API returned status ${res.status} for ${projectPath}!${iid}.`, res.status);
		}
		mr = res.json as GitlabMrApiResponse;
	} catch (err) {
		if (err instanceof GitlabApiError) throw err;
		throw new GitlabApiError(`Failed to reach ${account.host}: ${(err as Error).message}`);
	}

	let approvalsRequired: number | null = null;
	let approvalsGiven: number | null = null;
	try {
		const approvalsRes = await requestUrl({
			url: `${base}/approvals`,
			headers,
			throw: false,
		});
		if (approvalsRes.status < 400) {
			const approvals = approvalsRes.json as GitlabApprovalsApiResponse;
			approvalsRequired = approvals.approvals_required ?? null;
			if (approvalsRequired !== null) {
				approvalsGiven = approvalsRequired - (approvals.approvals_left ?? 0);
			}
		}
	} catch {
		// Approvals endpoint is only available on GitLab Premium/Ultimate; ignore failures.
	}

	return {
		iid: mr.iid,
		projectPath,
		title: mr.title,
		state: mr.state,
		draft: mr.draft ?? mr.work_in_progress ?? false,
		webUrl: mr.web_url,
		author: mr.author?.username ?? "unknown",
		authorAvatar: mr.author?.avatar_url,
		sourceBranch: mr.source_branch,
		targetBranch: mr.target_branch,
		createdAt: mr.created_at,
		updatedAt: mr.updated_at,
		mergedAt: mr.merged_at,
		closedAt: mr.closed_at,
		upvotes: mr.upvotes,
		downvotes: mr.downvotes,
		pipelineStatus: mr.head_pipeline?.status ?? null,
		hasConflicts: mr.has_conflicts ?? false,
		approvalsRequired,
		approvalsGiven,
	};
}
