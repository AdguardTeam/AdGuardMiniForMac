#!/usr/bin/env ruby
# frozen_string_literal: true

#
# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

# Third-party dependency update script.
#
# Usage:
#   bundle exec ruby Support/Scripts/update_third_party_deps.rb
#   bundle exec ruby Support/Scripts/update_third_party_deps.rb --dry-run
#   bundle exec ruby Support/Scripts/update_third_party_deps.rb \
#     --packages=assistant,safariconverterlib

require 'json'
require 'open3'
require 'fileutils'
require 'bundler/setup'
require 'plist'

PROJECT_ROOT = File.expand_path('../..', __dir__)

CONTENT_SCRIPT_PATH = File.join(
  PROJECT_ROOT, 'AdguardMini', 'PopupExtension', 'ContentScript'
)
CONTENT_SCRIPT_PACKAGE = File.join(CONTENT_SCRIPT_PATH, 'package.json')
PROJECT_PBXPROJ = File.join(
  PROJECT_ROOT, 'AdguardMini', 'AdguardMini.xcodeproj', 'project.pbxproj'
)
THIRD_PARTY_PLIST = File.join(
  PROJECT_ROOT, 'AdguardMini', 'AdguardMini',
  'Resources', 'ThirdPartyDependencies.plist'
)

NPM_PACKAGES = %w[assistant safari-extension].freeze
SPM_PACKAGES = %w[safariconverterlib].freeze
ALL_PACKAGES = (NPM_PACKAGES + SPM_PACKAGES).freeze

NPM_NAME_MAP = {
  '@adguard/assistant' => 'assistant',
  '@adguard/safari-extension' => 'safari-extension'
}.freeze

# ── Helpers ───────────────────────────────────────────────────────────────

def info(msg)   = puts "  #{msg}"
def success(msg) = puts "  \u2713 #{msg}"
def warning(msg) = puts "  \u26A0 #{msg}"
def error(msg)   = puts "  \u2717 #{msg}"
def header(title) = puts "\n--- #{title} #{'-' * (60 - title.length)}"

def run_cmd(cmd)
  stdout, stderr, status = Open3.capture3(cmd)
  return stdout if status.success?

  raise "'#{cmd}' failed: #{stderr.strip}"
end

# ── Argument parsing ──────────────────────────────────────────────────────

def parse_args
  dry_run = false
  target_packages = nil

  ARGV.each do |arg|
    case arg
    when '--dry-run' then dry_run = true
    when /\A--packages=(.+)\z/
      target_packages = Regexp.last_match(1).split(',').map(&:strip)
    when '--help', '-h'
      print_help
      exit 0
    end
  end

  if target_packages
    invalid = target_packages - ALL_PACKAGES
    unless invalid.empty?
      error("Unknown packages: #{invalid.join(', ')}")
      info("Available: #{ALL_PACKAGES.join(', ')}")
      exit 1
    end
  end

  [dry_run, target_packages]
end

def print_help
  puts "Usage: bundle exec ruby #{$PROGRAM_NAME} [options]"
  puts
  puts 'Options:'
  puts '  --dry-run           Check for updates without applying'
  puts '  --packages=P1,P2    Only update specified packages'
  puts "                      (#{ALL_PACKAGES.join(', ')})"
  puts '  --help, -h          Show this help'
end

# ── Version helpers ───────────────────────────────────────────────────────

def version_to_comparable(version)
  version.split('.').map(&:to_i)
end

def version_compare(version1, version2)
  v1 = version1.split('.').map(&:to_i)
  v2 = version2.split('.').map(&:to_i)

  max_len = [v1.length, v2.length].max
  v1 += [0] * (max_len - v1.length)
  v2 += [0] * (max_len - v2.length)
  v1 <=> v2
end

def satisfies_caret?(version, base_version)
  v_parts = version.split('.').map(&:to_i)
  b_parts = base_version.split('.').map(&:to_i)
  return false if v_parts[0] != b_parts[0]

  version_compare(version, base_version) >= 0
end

def satisfies_tilde?(version, base_version)
  v_parts = version.split('.').map(&:to_i)
  b_parts = base_version.split('.').map(&:to_i)
  return false if v_parts[0] != b_parts[0] || v_parts[1] != b_parts[1]

  version_compare(version, base_version) >= 0
end

def version_satisfies_spec?(version, version_spec)
  prefix = version_spec.match(/^[^\d]*/).to_s
  base_version = version_spec.gsub(/^[^\d]*/, '')

  case prefix
  when '^' then satisfies_caret?(version, base_version)
  when '~' then satisfies_tilde?(version, base_version)
  when '>=' then version_compare(version, base_version) >= 0
  when '>'  then version_compare(version, base_version) > 0
  when '<=' then version_compare(version, base_version) <= 0
  when '<'  then version_compare(version, base_version) < 0
  else version == base_version
  end
end

def preserve_version_prefix(old_spec, new_version)
  prefix = old_spec.match(/^[^\d]*/).to_s
  "#{prefix}#{new_version}"
end

def get_compatible_version(package_name, version_spec)
  result = `npm view #{package_name} versions --json 2>/dev/null`.strip
  all_versions = JSON.parse(result)

  compatible = all_versions.select { |v| version_satisfies_spec?(v, version_spec) }
  return version_spec if compatible.empty?

  highest = compatible.max_by { |v| version_to_comparable(v) }
  preserve_version_prefix(version_spec, highest)
rescue StandardError => e
  warning("Could not fetch versions for #{package_name}: #{e.message}")
  version_spec
end

# ── npm helpers ───────────────────────────────────────────────────────────

def detect_npm_projects
  projects = []

  if File.exist?(CONTENT_SCRIPT_PACKAGE)
    projects << {
      path: CONTENT_SCRIPT_PATH,
      package_json: CONTENT_SCRIPT_PACKAGE,
      lock_file: CONTENT_SCRIPT_PATH + '/yarn.lock',
      manager: 'yarn'
    }
  end

  info("Detected #{projects.count} npm projects")
  projects
end

def update_npm_dependencies(projects, target_packages: nil)
  overall = false
  results = []

  projects.each_with_index do |project, index|
    name = File.basename(project[:path])
    info("[#{index + 1}/#{projects.count}] Updating #{name}")

    begin
      changes = update_single_npm_project(project, target_packages: target_packages)
      overall ||= changes
      results << [name, changes ? 'Updated' : 'No changes', project[:manager]]
    rescue StandardError => e
      results << [name, 'Failed', e.message]
      error("Failed to update #{name}: #{e.message}")
    end
  end

  print_table(%w[Project Status Manager], results)
  overall
end

def update_single_npm_project(project, target_packages: nil)
  Dir.chdir(project[:path]) do
    package_data = JSON.parse(File.read('package.json'))
    updated_deps = {}

    (package_data['dependencies'] || {}).each do |name, version|
      if target_packages
        pkg_key = NPM_NAME_MAP[name]
        next unless pkg_key && target_packages.include?(pkg_key)
      end

      compatible_version = get_compatible_version(name, version)
      next unless compatible_version && compatible_version != version

      updated_deps[name] = { from: version, to: compatible_version }
      package_data['dependencies'][name] = compatible_version
    end

    if updated_deps.any?
      File.write('package.json', "#{JSON.pretty_generate(package_data)}\n")

      info('Running yarn install...')
      run_cmd('yarn install')

      updated_deps.each do |name, versions|
        success("#{name}: #{versions[:from]} \u2192 #{versions[:to]}")
      end
    end

    sync_assistant_version_to_plist
    updated_deps.any?
  end
end

def sync_assistant_version_to_plist
  resolved = get_resolved_assistant_version
  return unless resolved

  plist_data = Plist.parse_xml(THIRD_PARTY_PLIST)
  return unless plist_data && plist_data['assistant']

  current = plist_data['assistant']['Version']
  return if current == resolved

  plist_data['assistant']['Version'] = resolved
  File.write(THIRD_PARTY_PLIST, plist_data.to_plist)
  success("Synced Assistant version in ThirdPartyDependencies.plist: " \
          "#{current} \u2192 #{resolved}")
rescue StandardError => e
  error("Failed to sync Assistant version: #{e.message}")
end

def get_resolved_assistant_version
  return unless File.exist?(File.join(CONTENT_SCRIPT_PATH, 'yarn.lock'))

  Dir.chdir(CONTENT_SCRIPT_PATH) do
    parse_yarn_lock_version('@adguard/assistant')
  end
end

def parse_yarn_lock_version(package_name)
  content = File.read('yarn.lock')
  escaped = Regexp.escape(package_name)
  match = content.match(
    /#{escaped}@[^:]+:\s*\n(?:[^\n]*\n)*?\s*version\s+"([^"]+)"/
  )
  match ? match[1] : nil
end

# ── SPM helpers (SafariConverterLib) ──────────────────────────────────────

def update_safari_converter_lib(dry_run: false)
  unless File.exist?(PROJECT_PBXPROJ)
    error("project.pbxproj not found at #{PROJECT_PBXPROJ}")
    return false
  end

  current_version = get_safari_converter_lib_version
  unless current_version
    error('Could not determine current SafariConverterLib version')
    return false
  end

  latest_version = get_latest_safari_converter_lib_version
  unless latest_version
    error('Could not fetch latest SafariConverterLib version')
    return false
  end

  info("SafariConverterLib: #{current_version} \u2192 #{latest_version}")

  if current_version == latest_version
    info('SafariConverterLib is up to date')
    return false
  end

  if dry_run
    warning("DRY RUN: Would update SafariConverterLib from " \
            "#{current_version} to #{latest_version}")
    return true
  end

  update_safari_converter_lib_in_project(latest_version)

  info('Resolving Swift packages...')
  project_file = File.join(PROJECT_ROOT, 'AdguardMini', 'AdguardMini.xcodeproj')
  run_cmd("xcodebuild -resolvePackageDependencies -project #{project_file}")

  success("Updated SafariConverterLib: #{current_version} \u2192 #{latest_version}")
  true
rescue StandardError => e
  error("Failed to update SafariConverterLib: #{e.message}")
  false
end

def get_safari_converter_lib_version
  content = File.read(PROJECT_PBXPROJ)
  match = content.match(/repositoryURL = "https:\/\/github\.com\/AdguardTeam\/SafariConverterLib";\s*requirement = \{\s*branch = ([^;]+);/)
  return match[1].strip if match

  nil
rescue StandardError => e
  error("Failed to read SafariConverterLib version: #{e.message}")
  nil
end

def get_latest_safari_converter_lib_version
  result = run_cmd(
    'git ls-remote --tags https://github.com/AdguardTeam/SafariConverterLib.git'
  )

  tags = result.split("\n")
               .map { |line| line.split("\t").last }
               .select { |ref| ref.start_with?('refs/tags/') }
               .map { |ref| ref.delete_prefix('refs/tags/') }
               .reject { |tag| tag.include?('^{}') }
               .select { |tag| tag.match?(/\Av?\d+\.\d+\.\d+\z/) }

  return nil if tags.empty?

  latest = tags.sort_by { |tag| tag.delete_prefix('v').split('.').map(&:to_i) }.last
  info("Latest SafariConverterLib version: #{latest}")
  latest
rescue StandardError => e
  error("Failed to fetch SafariConverterLib versions: #{e.message}")
  nil
end

def update_safari_converter_lib_in_project(new_version)
  content = File.read(PROJECT_PBXPROJ)

  updated_content = content.gsub(
    /(repositoryURL = "https:\/\/github\.com\/AdguardTeam\/SafariConverterLib";\s*requirement = \{\s*branch = )[^;]+(;)/,
    "\\1#{new_version}\\2"
  )

  File.write(PROJECT_PBXPROJ, updated_content)
  info('Updated SafariConverterLib version in project.pbxproj')
rescue StandardError => e
  error("Failed to update project.pbxproj: #{e.message}")
  raise
end

# ── Table printing ────────────────────────────────────────────────────────

def print_table(headers, rows)
  return if rows.empty?

  col_widths = headers.map(&:length)
  rows.each do |row|
    row.each_with_index do |cell, i|
      col_widths[i] = [col_widths[i], cell.to_s.length].max
    end
  end

  header_line = headers.map.with_index { |h, i| h.ljust(col_widths[i]) }.join(' | ')
  info(header_line)
  info('-' * header_line.length)

  rows.each do |row|
    line = row.map.with_index { |c, i| c.to_s.ljust(col_widths[i]) }.join(' | ')
    puts "    #{line}"
  end
end

# ── Main ──────────────────────────────────────────────────────────────────

def main
  dry_run, target_packages = parse_args

  if dry_run
    warning('DRY RUN — no changes will be applied')
    puts
  end

  changes = false

  # SafariConverterLib
  if !target_packages || target_packages.include?('safariconverterlib')
    header('SafariConverterLib')
    changes |= update_safari_converter_lib(dry_run: dry_run)
  end

  # npm dependencies
  if !target_packages || (target_packages & NPM_PACKAGES).any?
    header('npm Dependencies')
    npm_projects = detect_npm_projects
    if npm_projects.any?
      changes |= update_npm_dependencies(npm_projects, target_packages: target_packages)
    else
      warning('No npm projects detected — skipping npm updates')
    end
  end

  puts
  if changes
    success('Dependencies updated successfully')
    info('Note: ThirdPartyDeps.swift will be regenerated automatically on next build')
  else
    info('All dependencies are up to date')
  end
end

main if __FILE__ == $PROGRAM_NAME
