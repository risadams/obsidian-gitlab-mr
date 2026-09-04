import assert from "node:assert/strict";
import test from "node:test";

import { findInlineMrRefs } from "../src/parser.ts";

test("finds a plain inline reference in rendered prose", () => {
	const text =
		"SC2-24349 moved to In Review through gitlab-mr:!2307; SC2-24413 remains in review.";
	const from = text.indexOf("gitlab-mr:!2307");

	assert.deepEqual(findInlineMrRefs(text), [
		{
			from,
			to: from + "gitlab-mr:!2307".length,
			rawRef: "!2307",
		},
	]);
});

test("finds shorthand, project, account, and URL references", () => {
	const references = [
		"gitlab-mr:!123",
		"gitlab-mr:group/project!456",
		"gitlab-mr:work:group/project!789",
		"gitlab-mr:work:!321",
		"gitlab-mr:https://gitlab.example.com/group/project/-/merge_requests/654",
	];
	const text = references.join(", ");

	assert.deepEqual(
		findInlineMrRefs(text).map((match) => match.rawRef),
		[
			"!123",
			"group/project!456",
			"work:group/project!789",
			"work:!321",
			"https://gitlab.example.com/group/project/-/merge_requests/654",
		]
	);
});

test("does not consume prose punctuation after a reference", () => {
	const text = "Review gitlab-mr:!2307, then gitlab-mr:group/project!42.";

	assert.deepEqual(
		findInlineMrRefs(text).map((match) => match.rawRef),
		["!2307", "group/project!42"]
	);
});
