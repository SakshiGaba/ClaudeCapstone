# Stories intake

Drop new user story source files here before running Stage 1 of the
pipeline.

Accepted formats: `.docx`, `.md`, `.txt` (JIRA/Confluence exports pasted into
a plain text file also work fine).

## Usage

```
/requirements stories/<your-story-file>
```

This is read by the `/requirements` command (`.claude/commands/requirements.md`),
which extracts the content, asks clarifying questions, and — once you've
answered — writes the finalized result to `my-app/requirements.md` through
the approval-gated flow described in `CLAUDE.md`.

## Convention

Name files with the story ID so history stays traceable, e.g.:

```
stories/ITEMS-101-user-story.docx
stories/ITEMS-102-user-story.md
```

Nothing in the pipeline hardcodes this folder or naming — it's a convention,
not a requirement. `/requirements` accepts any valid path you give it.
