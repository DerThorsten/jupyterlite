# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.import click

# Heavily inspired by:
# - https://github.com/jupyterlab/jupyterlab/blob/master/buildutils/src/bumpversion.ts
# - https://github.com/jupyterlab/retrolab/blob/main/buildutils/src/release-bump.ts
# - https://github.com/voila-dashboards/voila/blob/master/scripts/bump-version.py

import json
import re
from pathlib import Path

import click
from jupyter_releaser.util import get_version, is_prerelease, run


OPTIONS = ["major", "minor", "release", "build"]

ENC = dict(encoding="utf-8")
ROOT = Path(__file__).parent.parent
ROOT_PACKAGE_JSON = ROOT / "package.json"
APP_PACKAGE_JSON = ROOT / "app" / "package.json"
APP_JUPYTERLITE_JSON = ROOT / "app" / "jupyter-lite.json"

PYOLITE_PACKAGE = ROOT / "packages" / "pyolite-kernel"
PYOLITE_PACKAGE_JSON = PYOLITE_PACKAGE / "package.json"
PYOLITE_KERNEL_SOURCE = PYOLITE_PACKAGE / "src" / "kernel.ts"
PYOLITE_INIT_PY = PYOLITE_PACKAGE / "py" / "pyolite" / "pyolite" / "__init__.py"


def replace_in_file(path, pattern, replacement):
    source = path.read_text(**ENC)
    replaced = re.sub(pattern, replacement, source)
    path.write_text(replaced, **ENC)


def postbump():
    # read the new app version
    app_json = json.loads(APP_PACKAGE_JSON.read_text(**ENC))
    new_version = app_json["version"]
    py_version = (
        new_version.replace("-alpha.", "a").replace("-beta.", "b").replace("-rc.", "rc")
    )

    # bump pyolite wheel import
    replace_in_file(
        PYOLITE_KERNEL_SOURCE,
        "pyolite-(.*)-py3-none-any.whl",
        f"pyolite-{py_version}-py3-none-any.whl",
    )
    replace_in_file(
        PYOLITE_INIT_PY, "__version__ = (.*)", f'__version__ = "{py_version}"'
    )

    # bump pyolite version
    pyolite_json = json.loads(PYOLITE_PACKAGE_JSON.read_text(**ENC))
    pyolite_json["pyolite"]["packages"]["py/pyolite"] = py_version
    PYOLITE_PACKAGE_JSON.write_text(json.dumps(pyolite_json, indent=2) + "\n", **ENC)

    # save the new version to the app jupyter-lite.json
    jupyterlite_json = json.loads(APP_JUPYTERLITE_JSON.read_text(**ENC))
    jupyterlite_json["jupyter-config-data"]["appVersion"] = new_version
    APP_JUPYTERLITE_JSON.write_text(
        json.dumps(jupyterlite_json, indent=2) + "\n", **ENC
    )

    # save the new version to the top-level package.json
    root_json = json.loads(ROOT_PACKAGE_JSON.read_text(**ENC))
    root_json["version"] = py_version
    ROOT_PACKAGE_JSON.write_text(json.dumps(root_json, indent=2), **ENC)

    run("doit repo:integrity", cwd=ROOT)


def patch(force=False):
    version = get_version()
    if is_prerelease(version):
        raise Exception("Can only make a patch release from a final version")

    run("bumpversion patch", quiet=True)
    # switches to alpha
    run("bumpversion release --allow-dirty", quiet=True)
    # switches to beta
    run("bumpversion release --allow-dirty", quiet=True)
    # switches to rc.
    run("bumpversion release --allow-dirty", quiet=True)
    # switches to final.

    # Version the changed
    cmd = "yarn run lerna version patch --no-push --force-publish --no-git-tag-version"
    if force:
        cmd += " --yes"
    run(cmd)


def update(spec, force=False):
    prev = get_version()

    # Make sure we have a valid version spec.
    if spec not in OPTIONS:
        raise Exception(f"Version spec must be one of: {OPTIONS}")

    is_final = not is_prerelease(prev)

    if is_final and spec == "release":
        raise Exception('Use "major" or "minor" to switch back to alpha release')

    if is_final and spec == "build":
        raise Exception("Cannot increment a build on a final release")

    # If this is a major release during the alpha cycle, bump
    # just the Python version.
    if "a" in prev and spec == "major":
        run(f"bumpversion {spec}")
        return

    # Determine the version spec to use for lerna.
    lerna_version = "preminor"
    if spec == "build":
        lerna_version = "prerelease"
    # a -> b
    elif spec == "release" and "a" in prev:
        lerna_version = "prerelease --preid=beta"
    # b -> rc
    elif spec == "release" and "b" in prev:
        lerna_version = "prerelease --preid=rc"
    # rc -> final
    elif spec == "release" and "c" in prev:
        lerna_version = "patch"
    if lerna_version == "preminor":
        lerna_version += " --preid=alpha"

    cmd = f"yarn run lerna version --force-publish --no-push --no-git-tag-version {lerna_version}"
    if force:
        cmd += " --yes"

    # For a preminor release, we bump 10 minor versions so that we do
    # not conflict with versions during minor releases of the top level package.
    if lerna_version == "preminor":
        for i in range(10):
            run(cmd)
    else:
        run(cmd)

    # Bump the version.
    run(f"bumpversion {spec} --allow-dirty")


@click.command()
@click.option("--force", default=False, is_flag=True)
@click.argument("spec", nargs=1)
def bump(force, spec):
    status = run("git status --porcelain").strip()
    if len(status) > 0:
        raise Exception("Must be in a clean git state with no untracked files")

    prev = get_version()
    is_final = not is_prerelease(prev)
    if spec == "next":
        spec = "patch" if is_final else "build"

    if spec == "patch":
        patch(force)
        return

    update(spec, force)

    postbump()


if __name__ == "__main__":
    bump()
