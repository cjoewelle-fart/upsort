# Listings: AlternativeTo and awesome-list pull requests (T120)

<!-- Marketing lead · 2026-11-20. Drafts only. Nothing here has been posted, submitted or sent. Creating any account, submitting the AlternativeTo listing and opening each pull request is the owner's call (Tier 1), from the owner's own account. GitHub topics: done by the owner on Nov 13. -->

**Checked on 2026-11-20.** Every rule below is quoted from a page fetched that day; the URL is next to it. Where a fact came from a third-party mirror or a search result rather than the venue itself, it says so.

**What I couldn't reach from the workspace on Nov 20:** GitHub's website and API (so no live commit history, PR history or star counts for any repo), ecosyste.ms's API, and AlternativeTo's "add app" form (it needs an account). Raw files from GitHub (README, CONTRIBUTING, PR templates) did load, and that's where the rules below come from. Activity dates come from ecosyste.ms and context-awesome pages, which are snapshots and can be months old. **Before opening any PR, open the list's "Commits" page and its closed PRs and check that something was merged in the last few months.** It takes about a minute.

**Upsort today (for checking against the rules):** public repo since Nov 13 (github.com/cjoewelle-fart/upsort, GPL-3.0, LICENSE file confirmed at the top of the repo on Nov 20), first release v1.0.0 on Nov 13 (release checklist 6.9), live at https://upsort.app/. Stars: 0 at the Nov 17 baseline (dashboard M9); I couldn't re-check on Nov 20 because the GitHub API was blocked.

**AI drafting:** these drafts were written with AI help. Lissy93/awesome-privacy requires PR text to be human-written and AI use disclosed; pluja/awesome-privacy closes "generated submissions". For every list, rewrite the PR body in your own words before you send it. The entries can stay as they are if you agree with them.

---

## 1. AlternativeTo

### What AlternativeTo says (https://alternativeto.net/faq, fetched 2026-11-20)

- New apps go through "Suggest new application" under the user icon, after you **verify your email**: "You need to verify your email address before you can submit a new app." Fields include "Platforms, License, Descriptions, Tags, etc."
- **Approval is up to their admins** ("The approval of user submissions is at admins' discretion"), and the queue is larger than they can review. There is a **paid priority review**, which only speeds up the review and doesn't guarantee approval. I don't recommend paying (and that would be your call).
- **Risk to know about:** they may decline "simple single-purpose online tools". Upsort is a full app (scan, set-aside groups, choose, save, receipt), so the long description should make that clear. The draft below does.
- **No links, emails or phone numbers in descriptions.** The website and source go in their own fields.
- **No self-promotion from profiles:** "Using user profiles to advertise products or software is not allowed." Add the app through the normal route only.
- **Alternatives:** "An application is an alternative to another application if its main 'task' and 'focus' is the same." Admins check suggested alternatives.
- After it's approved, you can ask for **developer access** to the page, so your edits go live without review.
- **Length limits:** the FAQ gives none, and the form needs an account, so I couldn't check them. The short description below is our approved 74-character line, which is short enough for any limit I'd expect.

A third-party write-up (https://buttondown.com/where-to-post/archive/submitting-on-alternativetonet, fetched 2026-11-20) describes four steps: "Name and main purpose", "Grab data from external sources" (skip it: that's for Mac and iOS store apps), "Main data" (price, platforms, open source…), "Additional metadata". It says review "usually" takes one or two days. That isn't AlternativeTo's own page, so treat it as a rough guide.

### The listing

| Field | Value |
|---|---|
| Name | Upsort |
| Website | https://upsort.app/ |
| Source code | https://github.com/cjoewelle-fart/upsort |
| Price | Free |
| License | Open source, GPL-3.0 |
| Platforms | Online (web-based). Don't tick Windows, Mac or Linux: it's not a download. Don't tick Self-hosted either. |
| Application type / category | Photo Manager, in "Photo Organization" (the category page at alternativeto.net/category/phots-and-graphics/photo-management/ is titled "Photo Organization", and "Photo Manager" is the app-type label it uses; fetched Nov 20) |
| Features / tags | **Image sorting** and **Sort by date** (both seen on fetched pages: the "Image sorting" feature page and PhotoMove's page). **No registration required**, **No upload** and **Browser-based** (these exist on AlternativeTo: their pages showed up in search results on Nov 20, but I didn't open them). Not "Works offline" or "Local-first": "works offline" is on hold for public copy (launch-message "Don't say"). Not "Data recovery": Upsort doesn't recover files. |
| Language | English |

**Short description** (74 characters, approved line from `team/content/launch-message.md` section 3)

> Sorts recovered files into a photo library by date. Free, in your browser.

**Long description** (approved text from `launch-message.md` section 3, unchanged; it has no links, as AlternativeTo requires)

> Made for recovered files.
>
> When a recovery program like PhotoRec finds lost photos, it gives them back as a jumble: lots of files with names like f12345678.jpg, mixed in with small preview copies, exact copies, damaged files and app images.
>
> Upsort finds the photos and videos, sets the rest aside, and sorts them by the date each one was taken. You look through, unselect anything you don't want, and save new copies into folders by year and month.
>
> It's free, and there's no account. It runs in your browser, on your computer, and works best in Chrome or Edge.
>
> Your photos are never uploaded. Your recovery folder is only read, never changed, and nothing is deleted. You can keep anything that was set aside.
>
> Upsort doesn't recover photos itself. It sorts what your recovery program already found.

Optional last line, if you want the code mentioned in the text too (it's in the License field anyway; the "open source" hold in launch-message.md ended when the LICENSE file went in and the repo went public on Nov 13): "The code is open source under the GPL-3.0."

### Which apps it's an alternative to

| App | Suggest? | Why (checked Nov 20) |
|---|---|---|
| **PhotoMove** (https://alternativeto.net/software/photomove/about) | **Yes** | Same main task. Its page says: "PhotoMove will sort your photos by date taken and move or copy them to dated folders." Windows only, freemium, proprietary. Upsort does the same job for recovered files, in the browser, and copies rather than moves. |
| PhotoRec (https://alternativeto.net/software/photorec/about) | **No** | PhotoRec recovers files; Upsort sorts what it found. Calling Upsort an alternative to PhotoRec would read as "recovers your photos", which we never say. |
| The PhotoRec sorting scripts (sort-PhotorecRecoveredFiles, photorec_sorter, PRECsort, recsort) | **Can't** | I found no AlternativeTo pages for them on Nov 20. Don't create pages for other people's tools. |
| photos2folders, DIM: Digital Image Mover, photoimport | No | photos2folders is marked discontinued. DIM and photoimport are for copying from a camera card, which is a different task. |

Note: our "Don't say" list rules out naming competitors in **our** copy. The "alternative to" link is part of AlternativeTo's page layout, not our text, and the descriptions above name no other product. Whether to suggest PhotoMove at all is your call; I recommend suggesting just that one.

### Steps for you

1. Sign up at alternativeto.net and verify your email (the FAQ says you can't submit before that).
2. Open the user icon (top right) → "Suggest new application".
3. Name: "Upsort". Skip the step that pulls data from app stores.
4. Fill in the fields from the table above, then paste the short and long descriptions.
5. Add the features and tags. If "Sort by date" or "No upload" doesn't come up when you type it, leave it out rather than making a new tag.
6. Submit, and don't pay for priority review.
7. Once it's approved: on PhotoMove's page, "Contribute to this page" → "Suggest Alternatives" → choose Upsort. Then ask for developer access to Upsort's page.
8. Tell me when it's live, and I'll add the page to the metrics (likes and comments, read by hand, no tracking).

---

## 2. Awesome-list pull requests

### Summary

| List | Fit | Its rules (short) | Activity | Status |
|---|---|---|---|---|
| aviaryan/awesome-no-login-web-apps | Good | No required account; describe strengths **and** shortcomings | Pushed about 12 days before Nov 16 (ecosyste.ms) | **Eligible now** |
| simon987/awesome-datahoarding | Good (it lists phockup and PhotoRec) | No written rules ("Feel free to contribute!") | Last push seen: 2023-09-14 (old snapshot) | **Eligible by its rules; check activity first** |
| ibaaj/awesome-OpenSourcePhotography | Fair | Open source; one PR per tool | Last push seen: 2022-03-20 | **Eligible by its rules, but probably inactive. Low priority** |
| Lissy93/awesome-privacy | Fair | First stable release over 4 months old; human-written PR | Active (large list) | **Not yet eligible** (earliest about Mar 13, 2027) |
| pluja/awesome-privacy | Weak to fair | 6+ months of steady work, real users, "a fresh repository with a handful of stars is not there yet" | Active | **Not yet eligible** (earliest about mid-May 2027) |
| awesome-selfhosted | Weak | First release over 4 months old; for software you host on your own server | Active | Not yet eligible, and probably not a fit |
| Cugu/awesome-forensics | No | "Tested in practice — has been used in real forensic work" | Active (5.2k stars) | Don't submit |
| bst04/tools-for-data-recovery | No | Asks for issues, not PRs | n/a | Don't submit: it lists recovery tools only, so being listed there would suggest Upsort recovers files |

Order I recommend: no-login web apps in weeks 2–4 (per the launch plan). Datahoarding only if its commits page shows recent merges. Photography only if you see merges after 2022. The privacy lists go on the calendar for March to May 2027.

---

### Eligible now

#### A. aviaryan/awesome-no-login-web-apps

- **Repo:** https://github.com/aviaryan/awesome-no-login-web-apps (default branch `master`)
- **Activity:** ecosyste.ms (https://repos.ecosyste.ms/hosts/GitHub/repositories/aviaryan%2Fawesome-no-login-web-apps, fetched Nov 20) shows 2,480 stars, "Last pushed: 12 days ago" and "Last synced: 4 days ago", so a push in early November 2026. CodeTriage (https://www.codetriage.com/aviaryan/awesome-no-login-web-apps, fetched Nov 20) shows open PRs #1025 to #1039, mostly "Add [app]". So people send apps all the time; how quickly they're merged I couldn't see. The bottom of "Graphics, Image and Design" has recent-looking entries for browser-only tools ("Runs fully in the browser, nothing uploaded"; "100% browser-side").
- **Rules** (https://raw.githubusercontent.com/aviaryan/awesome-no-login-web-apps/master/CONTRIBUTING.md, fetched Nov 20):
  - "Do not add an app that requires an account to use its core features." Upsort has no account.
  - "Description about links should give an account of the outstanding features and major short-coming of the item, if any." So the entry states the limits.
  - "Description should end with a full-stop."
  - "Add new items at the bottom of the list of a category."
  - "Try to avoid adding similar apps in **Miscellaneous** section."
  - README intro: "Curated list of awesome web apps that work without requesting you to create an account."
- **Section:** "Graphics, Image and Design", as the last line (currently after "ShotFrame"). It already lists photo tools. "Utilities (uncategorized)" is the second choice.
- **Entry** (the list uses `* [Name](link) - Description.`):

```markdown
* [Upsort](https://upsort.app/) - Sorts the files PhotoRec gives back after a recovery into a photo library by the date each photo was taken. Runs in the browser and nothing is uploaded; it only reads the recovery folder and saves new copies. It doesn't recover photos itself, and saving into folders needs Chrome or Edge (other browsers save zip files).
```

- **PR title:** `Add Upsort to Graphics, Image and Design`
- **PR body:**

```markdown
Adds Upsort (https://upsort.app/) at the bottom of "Graphics, Image and Design".

What it is: a web app that sorts the files PhotoRec gives back after a recovery (thousands of files named like f12345678.jpg) into a photo library by date taken. It works without an account. Files are read in the browser and nothing is uploaded. It only reads the recovery folder and saves new copies in a folder you choose.

Shortcomings, as the guidelines ask: it doesn't recover photos itself (PhotoRec does that part), it's only tested with PhotoRec's output, and saving straight into folders needs Chrome or Edge; Safari and Firefox save zip files instead.

Source: https://github.com/cjoewelle-fart/upsort (GPL-3.0)

Disclosure: I made Upsort.
```

---

### Eligible by the rules, but check activity first

#### B. simon987/awesome-datahoarding

- **Repo:** https://github.com/simon987/awesome-datahoarding (branch `master`)
- **Activity:** not confirmed. ecosyste.ms (https://awesome.ecosyste.ms/projects/github.com%2Fsimon987%2Fawesome-datahoarding, fetched Nov 20) shows "last pushed 2023-09-14" from a snapshot synced 2024-07-30, so it's out of date. context-awesome (https://www.context-awesome.com/list/simon987/awesome-datahoarding, fetched Nov 20) shows 1.3k stars and no commit date. **Open the commits page first. If nothing's been merged in 2026, skip it.**
- **Rules:** the repo has no CONTRIBUTING.md (none at `master` or `main` on Nov 20). The README (https://raw.githubusercontent.com/simon987/awesome-datahoarding/master/README.md, fetched Nov 20) only says "Feel free to contribute!" and that it's "only a first draft/brainstorm". Entries are written as `* [Name](link): Description`, with no full stop, and the "Data curation" section is roughly alphabetical.
- **Section:** "Data curation", between `tree` and `WinDirStat`. It already has phockup ("Media sorting tool to organize photos and videos from your camera"). The list also has a "Data recovery" section with PhotoRec in it, but putting Upsort there would suggest it recovers files, so I don't recommend it.
- **Entry:**

```markdown
* [Upsort](https://upsort.app/): Sorts the files PhotoRec recovers into a photo library by date taken, in the browser. Nothing is uploaded, and the recovery folder is only read, never changed
```

- **PR title:** `Add Upsort to Data curation`
- **PR body:**

```markdown
Adds Upsort to "Data curation", between tree and WinDirStat.

Upsort is a web app for the step after PhotoRec: it reads the recovery folder (recup_dir.1, recup_dir.2, …), sets aside small preview copies, exact copies, damaged files and app images, and sorts the photos and videos by the date each was taken. It saves new copies into year and month folders. Everything happens in the browser; nothing is uploaded, and the recovery folder is never changed. It doesn't recover files itself.

Source: https://github.com/cjoewelle-fart/upsort (GPL-3.0)

Disclosure: I made it.
```

#### C. ibaaj/awesome-OpenSourcePhotography

- **Repo:** https://github.com/ibaaj/awesome-OpenSourcePhotography (branch `master`). A copy also exists at github.com/Awesome-Library/awesome-OpenSourcePhotography. Submit to ibaaj's original.
- **Activity:** probably inactive. ecosyste.ms (https://awesome.ecosyste.ms/projects/github.com%2Fibaaj%2Fawesome-OpenSourcePhotography, fetched Nov 20) shows 513 stars, "last pushed 2022-03-20" (snapshot synced 2024-05-22). Many links in the README are old (for example yorba.org for Shotwell). **Submit only if the commits page shows merges after 2022.**
- **Rules** (https://raw.githubusercontent.com/ibaaj/awesome-OpenSourcePhotography/master/CONTRIBUTING.md, fetched Nov 20):
  - "Make an individual pull request for each suggestion."
  - "Use the following format: `[List Name](link) - optional short description`"
  - "Tool must be open source." Upsort is GPL-3.0.
  - "Tools that heavily rely on external AI systems are not allowed." Upsort uses none.
  - "The pull request and commit should have a useful title."
- **Section:** "Photo Organizers", as the last line (after PhotoPrism). The section isn't in alphabetical order.
- **Entry:**

```markdown
- [Upsort](https://upsort.app/) - Sorts the files PhotoRec recovers into a photo library by date taken, in the browser. Nothing is uploaded, and the recovery folder is never changed.
```

- **PR title:** `Add Upsort to Photo Organizers`
- **PR body:**

```markdown
Adds Upsort to "Photo Organizers".

Upsort is an open-source (GPL-3.0) web app that sorts the files PhotoRec gives back after a recovery into a photo library by date taken, setting aside small preview copies, exact copies and damaged files instead of deleting them. It runs in the browser; nothing is uploaded. It doesn't recover photos itself.

Site: https://upsort.app/
Source: https://github.com/cjoewelle-fart/upsort

Disclosure: I made it.
```

---

### Not yet eligible

Don't submit these yet. Each would likely be closed on its own rules. The drafts are here so they're ready when the dates come.

#### D. Lissy93/awesome-privacy (earliest about 2027-03-13)

- **Repo:** https://github.com/Lissy93/awesome-privacy (branch `main`)
- **Why not yet** (https://raw.githubusercontent.com/Lissy93/awesome-privacy/main/.github/CONTRIBUTING.md, fetched Nov 20):
  - "Repositories must not be newly created, and the first stable release older than 4 months." v1.0.0 came out on Nov 13, 2026, so the earliest date is about Mar 13, 2027.
  - "Software needs to have a proven track record of commitment to maintenance."
  - "Submitted content must be human-written, including descriptions and PR bodies … If AI has been used substantially while preparing a PR, this should be clearly disclosed." **So you write the PR text yourself.** Their PR template also has hidden comments asking automated submitters to add a particular image; that's their bot check. Don't add it.
- **Other rules:** edit only `awesome-privacy.yml`, not the README. PR title format: `Adds [software-name] to [section-name]`. One addition per PR. Fill in every section of the PR template (Type, Changes, Supporting Material, Affiliation, Checklist). Add the entry "at the bottom of the appropriate category". "Description needs to be 50-250 characters, and must not read like an advert. Be objective, and include drawbacks as well as strengths." "You must be transparent about your affiliation." Reply to review comments within 14 days.
- **Section:** Media → Photo Management, at the bottom. That section's `alternativeTo` line names Google Photos, Lightroom and the like, which Upsort doesn't replace, so the fit is borderline. Expect questions.
- **Entry draft** (the description is 241 characters):

```yaml
      - name: Upsort
        url: https://upsort.app
        github: cjoewelle-fart/upsort
        openSource: true
        description: |
          Browser app that sorts the files PhotoRec gives back after a recovery into a photo library by date taken. Files are read on your computer and never uploaded, and the recovery folder is never changed. Saving into folders needs Chrome or Edge.
```

- **PR title:** `Adds Upsort to Photo Management`
- **PR body:** use their template. In "Affiliation", write "I made Upsort." In "Supporting Material", link the repo, the README's "Privacy by design" section and the privacy page. Write "Changes" yourself (their rule), and say whether AI helped.

#### E. pluja/awesome-privacy (earliest about mid-May 2027)

- **Repo:** https://github.com/pluja/awesome-privacy (branch `main`)
- **Why not yet** (https://raw.githubusercontent.com/pluja/awesome-privacy/main/misc/Contributing.md, fetched Nov 20):
  - "It is mature and maintained: at least 6 months of steady work … Age counts from when the current code started." Work started in October 2026 (team files), so the earliest is about April to May 2027.
  - "People actually use it … A fresh repository with a handful of stars is not there yet; come back when it is."
  - "It replaces something. Say what mainstream tool it is an alternative to." Upsort doesn't clearly replace a mainstream privacy-invasive service, so it's a weak fit even later.
  - "Low-effort or generated submissions … are closed without review." "If you build or work on the project, say so in the pull request."
  - From the README: "It is not a place to promote projects: things are added once they have shown they last, not to help them get noticed. Most new suggestions are declined."
- **Other rules** (PR template, https://raw.githubusercontent.com/pluja/awesome-privacy/main/.github/PULL_REQUEST_TEMPLATE.md): edit a file in `data/sections/`, not README.md. One project per PR. "The description is one plain sentence, with no marketing words." Leave out `license` and `added`. They review in monthly batches.
- **Section:** `data/sections/photo-editing-and-management.yaml`, subsection "Web" (it lists miniPaint with "edits images entirely in your browser, with nothing sent to a server").
- **Entry draft:**

```yaml
        - name: Upsort
          url: https://upsort.app/
          repo: https://github.com/cjoewelle-fart/upsort
          description: Sorts the files PhotoRec gives back after a recovery into a photo library by date, reading them in your browser without uploading anything.
          platforms:
            - web
          tags:
            - no-account
```

  (No `offline` tag until "works offline" is cleared for public copy.)
- **PR title:** `Adds Upsort to Photo Editing and Management`
- **PR body:** their template has three parts. "What this adds": one line, plus what it replaces (honestly, nothing mainstream: desktop sorters like PhotoMove, or sorting by hand). "Your relationship to the project": "I'm the author." Then the checklist. Write it yourself.

#### Also checked, not recommended

- **awesome-selfhosted** (https://github.com/awesome-selfhosted/awesome-selfhosted; rules from https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted-data/master/CONTRIBUTING.md, fetched Nov 20): needs "first release more than four months old" (Mar 13, 2027 at the earliest) and "working installation instructions". It lists "network services and web applications which can be hosted on your own server(s)". Upsort's static build could be hosted that way, but the README has no hosting guide, and the people who need Upsort don't run servers. Revisit only if someone asks for a self-hosting guide.
- **Cugu/awesome-forensics** (https://github.com/Cugu/awesome-forensics; rules from https://raw.githubusercontent.com/Cugu/awesome-forensics/main/CONTRIBUTING.md, fetched Nov 20): wants tools "Useful for forensic work" and "Tested in practice — has been used in real forensic work, not just a proof of concept". Upsort is for people sorting their own photos, and we can't claim forensic use. Don't submit.
- **bst04/tools-for-data-recovery** (https://raw.githubusercontent.com/bst04/tools-for-data-recovery/main/README.md, fetched Nov 20): "If you know more data recovery tools please make an issue." It lists recovery programs only, so being listed there would suggest Upsort recovers files.
- **meichthys/foss_photo_libraries**: a comparison of self-hosted photo library servers (Immich, PhotoPrism…). Upsort isn't one.
