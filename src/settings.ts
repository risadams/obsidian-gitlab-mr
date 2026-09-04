import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type { SettingDefinitionItem, SettingDefinitionPage } from "obsidian";
import type GitlabMrPlugin from "./main";
import { GitlabAccount } from "./types";

export interface GitlabMrSettings {
	accounts: GitlabAccount[];
	cacheTtlMinutes: number;
	showAuthor: boolean;
	showPipelineStatus: boolean;
	showApprovals: boolean;
	openInBrowserOnClick: boolean;
}

export const DEFAULT_SETTINGS: GitlabMrSettings = {
	accounts: [
		{
			alias: "default",
			host: "https://gitlab.com",
			token: "",
			isDefault: true,
			defaultProjectPath: "",
		},
	],
	cacheTtlMinutes: 15,
	showAuthor: true,
	showPipelineStatus: true,
	showApprovals: true,
	openInBrowserOnClick: true,
};

const ACCOUNT_KEY_PATTERN = /^accounts\.(\d+)\.(.+)$/;

export class GitlabMrSettingTab extends PluginSettingTab {
	plugin: GitlabMrPlugin;

	constructor(app: App, plugin: GitlabMrPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: "group",
				items: [
					{
						name: "Cache duration (minutes)",
						desc: "How long a merge request's status is cached before it is re-fetched from GitLab.",
						control: {
							type: "number",
							key: "cacheTtlMinutes",
							min: 0,
							step: 1,
							validate: (value) => (value < 0 ? "Must be zero or greater." : undefined),
						},
					},
					{
						name: "Show author",
						desc: "Display the merge request author in the rendered badge.",
						control: { type: "toggle", key: "showAuthor" },
					},
					{
						name: "Show pipeline status",
						desc: "Display the latest CI pipeline status.",
						control: { type: "toggle", key: "showPipelineStatus" },
					},
					{
						name: "Show approvals",
						desc: "Display approval counts when the GitLab tier supports it.",
						control: { type: "toggle", key: "showApprovals" },
					},
					{
						name: "Open in browser on click",
						desc: "Clicking a rendered merge request badge opens it in your browser.",
						control: { type: "toggle", key: "openInBrowserOnClick" },
					},
				],
			},
			{
				type: "list",
				heading: "Accounts",
				desc:
					"Configure one or more GitLab instances. Reference a non-default account in your notes with " +
					"\"alias:group/project!123\". The default account is used when no alias is given. Set a default " +
					"project below to reference its merge requests with just \"!123\" (or \"alias:!123\").",
				items: this.plugin.settings.accounts.map((account, index) => this.buildAccountPage(account, index)),
				addItem: {
					name: "Add account",
					action: async () => {
						this.plugin.settings.accounts.push({
							alias: `account${this.plugin.settings.accounts.length + 1}`,
							host: "https://gitlab.com",
							token: "",
							isDefault: false,
							defaultProjectPath: "",
						});
						await this.plugin.saveSettings();
						this.update();
					},
				},
				onDelete: async (index) => {
					if (this.plugin.settings.accounts.length <= 1) {
						new Notice("At least one account is required.");
						return;
					}
					this.plugin.settings.accounts.splice(index, 1);
					if (!this.plugin.settings.accounts.some((a) => a.isDefault)) {
						this.plugin.settings.accounts[0].isDefault = true;
					}
					await this.plugin.saveSettings();
					this.update();
				},
			},
			{
				type: "group",
				items: [
					{
						name: "Clear cache",
						desc: "Immediately discard cached merge request status.",
						render: (setting: Setting) => {
							setting.addButton((btn) =>
								btn.setButtonText("Clear cache").onClick(() => {
									this.plugin.cache.clear();
									new Notice("GitLab MR cache cleared.");
								})
							);
						},
					},
				],
			},
		];
	}

	private buildAccountPage(account: GitlabAccount, index: number): SettingDefinitionPage {
		return {
			type: "page",
			name: account.alias || `Account ${index + 1}`,
			desc: account.host,
			items: [
				{
					name: "Alias",
					control: {
						type: "text",
						key: `accounts.${index}.alias`,
						placeholder: "Alias (e.g. work)",
					},
				},
				{
					name: "Host",
					control: {
						type: "text",
						key: `accounts.${index}.host`,
						placeholder: "https://gitlab.example.com",
					},
				},
				{
					name: "Personal access token",
					render: (setting: Setting) => {
						setting.addText((text) => {
							text
								.setPlaceholder("Personal access token")
								.setValue(account.token)
								.onChange(async (value) => {
									account.token = value.trim();
									await this.plugin.saveSettings();
								});
							text.inputEl.type = "password";
						});
					},
				},
				{
					name: "Default account",
					control: { type: "toggle", key: `accounts.${index}.isDefault` },
				},
				{
					name: "Default project",
					desc: `Default project for "${account.alias || `account ${index + 1}`}"`,
					control: {
						type: "text",
						key: `accounts.${index}.defaultProjectPath`,
						placeholder: "group/project",
					},
				},
			],
		};
	}

	getControlValue(key: string): unknown {
		const accountMatch = key.match(ACCOUNT_KEY_PATTERN);
		if (accountMatch) {
			const [, indexStr, field] = accountMatch;
			const account = this.plugin.settings.accounts[Number(indexStr)] as unknown as
				| Record<string, unknown>
				| undefined;
			return account?.[field];
		}
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const accountMatch = key.match(ACCOUNT_KEY_PATTERN);
		if (accountMatch) {
			const [, indexStr, field] = accountMatch;
			const account = this.plugin.settings.accounts[Number(indexStr)];
			if (!account) return;

			if (field === "isDefault") {
				if (value) {
					this.plugin.settings.accounts.forEach((a) => (a.isDefault = false));
					account.isDefault = true;
				} else {
					account.isDefault = false;
				}
				await this.plugin.saveSettings();
				this.update();
				return;
			}

			if (field === "host" && typeof value === "string") {
				account.host = value.trim().replace(/\/+$/, "");
			} else if ((field === "alias" || field === "defaultProjectPath") && typeof value === "string") {
				(account as unknown as Record<string, unknown>)[field] = value.trim();
			} else {
				(account as unknown as Record<string, unknown>)[field] = value;
			}
			await this.plugin.saveSettings();
			return;
		}

		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();
	}
}
