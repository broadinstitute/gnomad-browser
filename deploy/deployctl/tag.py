import re
import subprocess


def get_tag_from_git_revision() -> str:
    commit_hash = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], encoding="utf-8").strip()
    tag = commit_hash

    branch = subprocess.check_output(["git", "symbolic-ref", "--short", "-q", "HEAD"], encoding="utf-8").strip()
    if branch != "main":
        tag_branch = re.sub(r"[^a-z0-9_\-\.]", "_", branch)
        tag = f"{tag}-{tag_branch}"

    status = subprocess.check_output(
        ["git", "status", "--porcelain"], stderr=subprocess.DEVNULL, encoding="utf-8"
    ).strip()
    if status:
        tag = f"{tag}-modified"

    return tag
