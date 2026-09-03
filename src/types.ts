export interface GitlabAccount {
	alias: string;
	host: string; // e.g. https://gitlab.com
	token: string; // personal/project access token
	isDefault: boolean;
	defaultProjectPath?: string; // e.g. group/project, used when a reference omits the project
}

export type MrState = "opened" | "closed" | "merged" | "locked";

export interface MergeRequestInfo {
	iid: number;
	projectPath: string;
	title: string;
	state: MrState;
	draft: boolean;
	webUrl: string;
	author: string;
	authorAvatar?: string;
	sourceBranch: string;
	targetBranch: string;
	createdAt: string;
	updatedAt: string;
	mergedAt: string | null;
	closedAt: string | null;
	upvotes: number;
	downvotes: number;
	pipelineStatus: string | null;
	hasConflicts: boolean;
	approvalsRequired: number | null;
	approvalsGiven: number | null;
}

export interface ParsedMrRef {
	raw: string;
	accountAlias: string | null;
	host: string | null;
	projectPath: string;
	iid: number;
	webUrl: string | null;
}

export interface CacheEntry {
	value: MergeRequestInfo;
	fetchedAt: number;
}
