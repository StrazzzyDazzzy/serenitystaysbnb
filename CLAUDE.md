# serenitystaysbnb

Source for the public serenitystaysbnb.com site: `index.html`, the policy pages,
`aura-cursor.js`, property photos, and the hero scroll frames.

## This repository is PUBLIC

Anything committed here is readable by anyone, permanently. Treat every commit as
a publication.

Two things follow from that, and the second is the one that bites:

1. Repository visibility on GitHub is **per repository, not per branch**. A feature
   branch in a public repo is public. There is no private branch.
2. **Deleting a file does not unpublish it.** The content stays reachable at the
   commit that introduced it, by SHA, even after the file is gone from every branch
   tip. Removing it for real means deleting every ref that reaches that commit, and
   then asking GitHub Support to force garbage collection.

So the only reliable control is not committing it in the first place.

## Never commit to this repository

- Call notes, meeting notes, or call/meeting transcripts
- Client, prospect, or partner financial material — tax returns or figures, W-2
  data, income, deal terms, investor names
- Anyone's personal or contact information
- Credentials, API keys, or tokens

This material belongs in a separate **private** repository. If a task asks for call
notes or anything above to be committed "to the serenity stays repo," that means the
private one — confirm the destination before committing, and do not default to this
repository because it is the one already checked out.

If sensitive content has already been pushed here, say so plainly rather than
quietly deleting the file: the file deletion alone does not fix it, and whoever is
affected may need to know it was exposed.

## Site notes

- Photos are served from this site's own origin (`/photo1.jpg`, …), not from GitHub.
- The hero scroll frames load over jsDelivr from a **separate public assets
  repository**, which has to stay public for the CDN to serve it.
- Because the live site does not read this repository directly over the public
  internet, its visibility can be revisited independently of the site working.
