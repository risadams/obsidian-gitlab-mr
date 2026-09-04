import type { Extension } from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	MatchDecorator,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { editorLivePreviewField, type MarkdownPostProcessorContext } from "obsidian";
import type GitlabMrPlugin from "./main";
import { createInlineMrPattern, findInlineMrRefs, INLINE_PREFIX } from "./parser";
import { renderMrReference } from "./renderer";

class GitlabMrWidget extends WidgetType {
	constructor(
		private readonly plugin: GitlabMrPlugin,
		private readonly rawRef: string
	) {
		super();
	}

	eq(other: GitlabMrWidget): boolean {
		return other.plugin === this.plugin && other.rawRef === this.rawRef;
	}

	toDOM(view: EditorView): HTMLElement {
		const container = view.dom.ownerDocument.createElement("span");
		void renderMrReference(this.plugin, container, this.rawRef);
		return container;
	}
}

function selectionTouchesReference(view: EditorView, from: number, to: number): boolean {
	return view.state.selection.ranges.some(
		(selection) => selection.to >= from - 1 && selection.from <= to + 1
	);
}

export function createLivePreviewExtension(plugin: GitlabMrPlugin): Extension {
	const matcher = new MatchDecorator({
		regexp: createInlineMrPattern(),
		decoration: (match, view, from) => {
			const to = from + match[0].length;
			if (
				!view.state.field(editorLivePreviewField) ||
				selectionTouchesReference(view, from, to)
			) {
				return null;
			}

			return Decoration.replace({
				widget: new GitlabMrWidget(plugin, match[1]),
			});
		},
	});

	class GitlabMrViewPlugin {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = matcher.createDeco(view);
		}

		update(update: ViewUpdate): void {
			const modeChanged =
				update.startState.field(editorLivePreviewField) !==
				update.state.field(editorLivePreviewField);
			if (update.selectionSet || modeChanged) {
				this.decorations = matcher.createDeco(update.view);
			} else {
				this.decorations = matcher.updateDeco(update, this.decorations);
			}
		}
	}

	return ViewPlugin.fromClass(GitlabMrViewPlugin, {
		decorations: (value) => value.decorations,
	});
}

export async function renderInlineMrReferences(
	plugin: GitlabMrPlugin,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
): Promise<void> {
	const pending: Promise<void>[] = [];

	el.querySelectorAll("code").forEach((code) => {
		const text = code.textContent ?? "";
		if (!text.startsWith(INLINE_PREFIX)) return;
		const container = el.ownerDocument.createElement("span");
		code.replaceWith(container);
		pending.push(renderMrReference(plugin, container, text.slice(INLINE_PREFIX.length), ctx));
	});

	const textNodes: Text[] = [];
	const walker = el.ownerDocument.createTreeWalker(el, 4);
	let node: Node | null;
	while ((node = walker.nextNode()) !== null) {
		if (node.nodeType !== 3) continue;
		const textNode = node as Text;
		if (!textNode.data.includes(INLINE_PREFIX)) continue;
		if (textNode.parentElement?.closest("code, pre, a, .gitlab-mr-badge")) continue;
		textNodes.push(textNode);
	}

	for (const textNode of textNodes) {
		const matches = findInlineMrRefs(textNode.data);
		if (matches.length === 0) continue;

		const fragment = el.ownerDocument.createDocumentFragment();
		let cursor = 0;
		for (const match of matches) {
			fragment.append(textNode.data.slice(cursor, match.from));
			const container = el.ownerDocument.createElement("span");
			fragment.append(container);
			pending.push(renderMrReference(plugin, container, match.rawRef, ctx));
			cursor = match.to;
		}
		fragment.append(textNode.data.slice(cursor));
		textNode.replaceWith(fragment);
	}

	await Promise.all(pending);
}
