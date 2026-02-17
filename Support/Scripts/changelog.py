#!/usr/bin/env python3

# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

import requests
import json
import os
import time
from optparse import OptionParser

# Configuration
MD_URL = 'https://jirahub.int.agrd.dev/v1/release_notes/changelog.md'
TXT_URL = 'https://jirahub.int.agrd.dev/v1/release_notes/changelog.txt'

CHANGELOG_NAME = "changelog.md"
BUILD_JSON_NAME = "build.json"
BUILD_JSON_PLATFORM = "Mac"

# Directory of this python file
CURRENT_DIR = os.path.dirname(os.path.realpath(__file__))


def get_args():
    """Parses, validates and returns arguments, passed to the script"""
    parser = OptionParser()
    parser.add_option("-o", "--output", dest="output",
                      help="Path to the directory where to place the changelog.md and build.json files")
    parser.add_option("-r", "--repo", dest="repo",
                      help="Internal repository name")
    parser.add_option("-R", "--gh-repo", dest="gh_repo",
                      help="Github repository name")
    parser.add_option("-f", "--from", dest="from_ref",
                      help="Commit of tag, after which to collect the changelog")
    parser.add_option("-v", "--version", dest="version",
                      help="Version that we will put to build.json")
    parser.add_option("-c", "--channel", dest="channel",
                      help="Update channel (can be nightly, beta or release)")
    parser.add_option("-b", "--branch", dest="branch",
                      help="Branch name to collect changelog from (default: master)")

    # pylint: disable=unused-variable
    (options, args) = parser.parse_args()

    if not options.repo:
        parser.error("Repo is not specified")

    if not options.gh_repo:
        parser.error("GitHub repo is not specified")

    if not options.output:
        parser.error("Output path is not specified")

    if not options.version:
        parser.error("Version is not specified")

    if not options.channel:
        parser.error("Channel is not specified")

    # Locations are relative to this python file location
    options.output = os.path.join(CURRENT_DIR, options.output)

    print('Args are: %s' % options)
    return options


def download(url, params):
    print("Downloading {0} with params:\n{1}".format(url, params))

    result = requests.get(url, params=params)
    print(result.request.url)
    if result.status_code != 200:
        raise ConnectionError("Could not download. Response status={0}\n{1}".format(result.status_code, result.text))

    print("Downloaded {0}".format(url))
    return result


def write_md_changelog(args):
    changelog_path = os.path.join(args.output, CHANGELOG_NAME)

    params = {
        'repo': args.repo,
        'github_repo': args.gh_repo
    }
    if args.from_ref and len(args.from_ref):
        params['from_ref'] = args.from_ref
    if args.branch and len(args.branch):
        params['branch'] = args.branch

    result = download(MD_URL, params).text

    with open(changelog_path, "w") as file:

        file.write("## Version {0} {1}\n\n{2}".format(
            args.version,
            args.channel,
            result))
    print("Changelog has been written to {0}".format(changelog_path))


def write_json_changelog(args):
    build_json_path = os.path.join(args.output, BUILD_JSON_NAME)

    params = {
        'repo': args.repo,
        'github_repo': args.gh_repo,
        'private': 'false'
    }
    if args.from_ref and len(args.from_ref):
        params['from_ref'] = args.from_ref
    if args.branch and len(args.branch):
        params['branch'] = args.branch

    result = download(TXT_URL, params).text

    build = {
        "version": args.version,
        "platform": BUILD_JSON_PLATFORM,
        "channel": args.channel,
        "changelog": result,
        "timestamp": int(time.time())
    }


    with open(build_json_path, "w") as file:
        json.dump(build, file, indent=4)

    print("Changelog has been written to {0}".format(build_json_path))

def main():
    print("Start collecting release notes")
    args = get_args()

    write_md_changelog(args)
    write_json_changelog(args)

    print("The changelog has been successfully collected")


# Entry point
main()
