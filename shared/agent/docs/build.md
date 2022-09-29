# LSP Agent Build Information

TeamCity Project: [codestream-lsp-agent](http://tc.codestream.us/project.html?projectId=CodestreamLspAgent)

## Assets

There are no assets at this time; only tests.

## Branches

| Branch     | Description                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| develop    | All work lands here. Used for CI build                                       |
| master     | Pre-relase work lands here. Used for Prod build                              |
| hotfix\_\* | branch name prefix for branches made off the **master** branch for hotfixing |

## Builds

There are 2 builds; one for the develop branch (Continuous Integration) and one for the master branch (Production).

| Build                                                                             | Env  | Execution                                                                    |
| --------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| [CI](http://tc.codestream.us/viewType.html?buildTypeId=CodestreamLspAgent_Ci)     | dev  | Triggered by updates to the **develop** branch and PR's.<br>Runs unit tests. |
| [Prod](http://tc.codestream.us/viewType.html?buildTypeId=CodestreamLspAgent_Prod) | prod | Triggered by updates to the **master** branch.<br>Runs unit tests.           |

## Production Release (untested / unconfirmed, more details needed)

There is no independent release for the LSP Agent at this time.

## Hotfixing (untested / unconfirmed, more thought needed)

1. we need a reliable way to do this with TC
