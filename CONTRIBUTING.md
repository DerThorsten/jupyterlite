# Contributing

Thanks for contributing to JupyterLite!

> We follow [Project Jupyter's Code of Conduct][coc] for a friendly and welcoming
> collaborative environment.

## Setup

### Get the Code

```bash
git clone https://github.com/jupyterlite/jupyterlite
```

> if you don't have `git` yet, you might be able to use the instructions below to get it

### Prerequisites

You'll need:

- `git`
- `nodejs >=12`
- `yarn <2`
- `python >=3.8`

Various package managers on different operating systems provide these.

> A recommended approach for _any platform_ is to install [Mambaforge] and use the
> Binder environment description checked into the repo.
>
> ```bash
> mamba env update --file .binder/environment.yml
> mamba activate jupyterlite-dev
> ```

For speed, in GitHub Actions, `python` and `nodejs` are installed directly. Provided you
already have these, to install the full development stack:

```bash
python -m pip install -r requirements-docs.txt -r requirements-lint.txt
```

## Development Tasks

### doit

[`doit`](https://github.com/pydoit/doit) handles the full software lifecycle, spanning
JavaScript to documentation building and link checking. It understands the dependencies
between different nested _tasks_, usually as files that change on disk.

#### List Tasks

To see all of the _tasks_ available, use the `list` action:

```bash
doit list --all --status
```

To get information about a specific _task_, use the info `info` _action_ with the _task_
name from the first column of `list`:

```bash
doit info build:js:app:retro
```

#### Task and Action Defaults

The default `doit` _action_ is `run` which... runs the named _tasks_.

The default tasks are `lint`, `build` and `docs:app:build`, so the following are
equivalent:

```bash
doit
doit lint build docs:app:build
doit run lint build docs:app:build
```

#### `doit auto`

On Linux and MacOS, `doit auto` (which can also accept task names) will watch all files
and perform any dependent tasks, then reload the tasks, useful for rapidly seeing
changes.

> By default, `auto` will invoke `doit lint` which may change source files. This can be
> confusing to IDEs (or the `watch:docs` and `watch:js` tasks) that might be performing
> their own watching, or run up against file system limits.

### Core JavaScript development

The JupyterLite core JS development workflow builds:

- a ready-to-serve, empty website with:
  - a `lab/index.html` and supporting assets
  - a `retro/*/index.html` and supporting assets (for `tree`, `editor`, etc.)
  - common configuration tools
- `typedoc` documentation
- > _TBD: a set of component tarballs distributed on `npmjs.com`. See [#7]._

from:

- a set of `packages` in the `@jupyterlite` namespace, , written in TypeScript
- some `buildutils`
- some `webpack` configuration
- some un-compiled, vanilla JS for very early-loading utilities
  - > TODO: fix this, perhaps with jsdoc tags

While most of the scripts below will be run (in the correct order based on changes) by
`doit`, the following _scripts_ (defined in `package.json`) are worth highlighting.

[#7]: https://github.com/jupyterlite/jupyterlite/issues/7

#### Quick start

Most of the [development tasks](#development-tasks) can be run with one command:

```bash
yarn bootstrap
```

#### Install JavaScript Dependencies

```bash
yarn
```

#### Build Apps

To build development assets:

```bash
yarn build
```

To build production assets:

```bash
yarn build:prod
```

#### Serve Apps

> These are **not real server solutions**, but they _will_ serve all of the assets types
> (including `.wasm`) correctly for JupyterLite development, testing, and demo purposes.

To serve with `scripts/serve.js`, based on Node.js's
[`http`](https://nodejs.org/api/http.html) module:

```bash
yarn serve
```

To serve with Python's built-in
[`http.server`](https://docs.python.org/3/library/http.server.html) module (requires
Python 3.7+):

```bash
yarn serve:py
```

#### Watch Sources

```bash
yarn watch
```

#### Lint/Format Sources

```bash
yarn lint
```

#### Run Unit Tests

```bash
yarn build:test
yarn test
```

### Lab Extension development

> _TBD: describe how the `@jupyterlite/labextension` works with e.g. **real**
> serverextensions_

### (Browser) Python Development

> _TBD: describe successor to `pyolite`, patches, etc. See [#151]._

[#151]: https://github.com/jupyterlite/jupyterlite/issues/151

### (Server) Python Development

After all the `yarn`-related work has finished, the terminal-compatible python uses the
`npm`-compatible tarball of `app` to build new sites combined with **original user
content**.

#### On testing

Extra `PYTEST_ARGS` can be passed as a (gross) JSON string:

```bash
PYTEST_ARGS='["-s", "-x", "--ff"]' doit test:py:jupyterlite
```

Several tasks invoke the `jupyter lite` CLI, which is further described in the main docs
site.

### Documentation

The documentation site, served on [jupyterlite.rtfd.io], uses information from different
parts of the software lifecycle (e.g. contains an archive of the built `app` directory),
so using the [doit](#doit) tools are recommended.

[jupyterlite.rtfd.io]: https://jupyterlite.rtfd.io

#### Build Documentation

```bash
doit docs
```

> Extra `sphinx-build` arguments are set by the `SPHINX_ARGS` environment variable. For
> example to fail on all warnings (the configuration for the ReadTheDocs build):
>
> ```bash
> SPHINX_ARGS='["-W"]' doit docs
> ```

#### Watch Documentation

```bash
doit watch:docs
```

> This also respects the `SPHINX_ARGS` variable. If working on the theme layer,
> `SPHINX_ARGS='["-a", "-j8"]'` is recommended, as by default static assets are not
> included in the calculation of what needs to be updated.

## Community Tasks

### Issues

JupyterLite features and bug fixes start as [issues] on GitHub.

- Look through the existing issues (and [pull requests]!) to see if a related issue
  already exists or is being worked on
- If it is new:
  - Start a [new issue]
  - Pick an appropriate template
  - Fill out the template
  - Wait for the community to respond

### Pull Requests

JupyterLite features and fixes become _real_ as [pull requests].

> Pull requests are a great place to discuss work-in-progress, but it is **highly
> recommended** to create an [issue](#issues) before starting work so the community can
> weigh in on choices.

- Fork the repo
- Make a new branch off `main`
- Make changes
- Run `doit`
- Push to your fork
- Start the pull request
  - your `git` CLI should offer you a link, as will the GitHub web UI
  - reference one or more [issue](#issues) so those that are interested can find your
    work
    - adding magic strings like `fixes #123` help tie the collaboration history together
- Wait for continuous integration
  - If stuff breaks, fix it or ask for help!

#### Previews

Each pull request is built and deployed on ReadTheDocs. You can view the live preview
site by clicking on the ReadTheDocs check:

![rtd-pr-preview](https://user-images.githubusercontent.com/591645/119787419-78db1c80-bed1-11eb-9a60-5808fea59614.png)

#### Artifacts

Additionally, several build artifacts are available from the each run on the [Actions]
page, including:

- test reports
- installable artifacts
- an app archive ready to be used as the input to the `jupyter lite` CLI with all the
  demo content and supporting extensions.

> You must be logged in to GitHub to download these.

[actions]: https://github.com/jupyterlite/jupyterlite/actions

### Releasing

> TBD: See [#121].

[#121]: https://github.com/jupyterlite/jupyterlite/issues/121
[issues]: https://github.com/jupyterlite/jupyterlite/issues
[new issue]: https://github.com/jupyterlite/jupyterlite/issues/new
[pull requests]: https://github.com/jupyterlite/jupyterlite/pulls
[repo]: https://github.com/jupyterlite/jupyterlite
[coc]: https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md
[mambaforge]: https://github.com/conda-forge/miniforge
