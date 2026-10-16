# Add this run's report to the Routine Reports page

The owner reads every routine's report on one page pinned in their claude.ai sidebar: "Routine Reports",
https://claude.ai/artifact/CEcgVPHfhubGDKyx1v9Pwo. Do this as the last step of every run, after the report is
written and the notification sent, even when the report is "nothing to do" or the run couldn't finish.

1. Load the tool with ToolSearch: "select:ArtifactData".
2. This run's link, so the page can open this chat on a phone or any browser:
   `echo "https://claude.ai/code/$(echo "$CLAUDE_CODE_REMOTE_SESSION_ID" | sed 's/^cse_/session_/')"`
   (it looks like https://claude.ai/code/session_01…).
3. Doc id: `<YYYY-MM-DD>-<routine id>`: the date the report covers (the daily summary's day, the audit's or figures'
   morning, the member reports' Monday) and the routine id given in your instructions.
4. ArtifactData `get` on collection `reports` with that doc id. If it exists (a second run the same day), write with
   `update` and its `version` as `if_version`; otherwise `set`. Use only `get`, `set` and `update` (never
   `str_replace`). Pass the fields inline as `data`, never as `file_path`.
5. Fields:
   - `routine`: the routine id. `site`: `starred-bill`.
   - `date`: YYYY-MM-DD as above. `at`: now, ISO UTC (e.g. 2026-10-16T07:41:00Z).
   - `title`: the headline in under 90 characters, e.g. "84 visitors, 5,108 Google impressions (+36%)".
   - `summary`: one sentence, under 160 characters, saying what (if anything) needs the owner.
   - `status`: `attention` when the owner needs to act, approve or reply (suggestions waiting, a key to swap,
     something broken); `failed` when the run couldn't finish; otherwise `ok`.
   - `body`: the whole report as you gave it to the owner, in Markdown (`##` headings, `-` lists, `| tables |`,
     `**bold**`, links as `[text](https://…)` or bare https:// addresses). Keep it under 50,000 characters.
   - `session`: the link from step 2 (leave it out if there isn't one).
6. If the write fails, say so in one line at the end of your report; don't retry more than once.

Starred Bill routines never ask the owner to approve suggestions by replying: suggested to-do items go on the to-do
page as status "suggested" (it shows them under "Waiting for your OK" with Add to list and Not now buttons), and the
report links there: [Approve these on your to-do list →](https://claude.ai/artifact/Axt5P5PtjBJ1R7VUziDPeL).

Only ever write this run's own document: the page also holds other sites' reports, which you never read or change.
If the owner later replies in this run's chat and that changes the outcome, update the doc's `summary` and `status`
to match.
