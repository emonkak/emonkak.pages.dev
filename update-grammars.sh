#!/bin/env bash

set -o errexit -o nounset

if [[ "${TRACE-0}" == "1" ]]
then
    set -o xtrace
fi

SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(dirname "${SCRIPT_PATH}")
TMP_DIR="${SCRIPT_DIR}/tmp"
GRAMMARS_DIR="${SCRIPT_DIR}/lib/grammars"

declare -a available_scopes=()

pull_source() {
  local url="$1"
  local dest_dir="$2"
  if [ ! -d "${dest_dir}" ]
  then
    echo "Clone ${url} ..."
    git clone "${url}" "${dest_dir}" --depth=1
  else
    echo "Checkout ${url} ..."
    git --git-dir "${dest_dir}/.git" --work-tree "${dest_dir}" checkout -f .
    git --git-dir "${dest_dir}/.git" --work-tree "${dest_dir}" pull
  fi
}

copy_syntaxes() {
  local dir="$1"
  while read -r path
  do
    if [[ "${path##*.}" == 'YAML-tmLanguage' ]]
    then
      tmp="${TMP_DIR}/${path##*/}.json"
      yaml2json < "${dir}/${path}" > "${tmp}"
      scope_name=$(jq -r .scopeName "${tmp}")
      mv -v "${tmp}" "${GRAMMARS_DIR}/${scope_name}.json"
    else
      scope_name=$(jq -r .scopeName "${dir}/${path}")
      cp -v "${dir}/${path}" "${GRAMMARS_DIR}/${scope_name}.json"
    fi
    available_scopes+=("${scope_name}")
  done < <(git --git-dir "${dir}/.git" --work-tree "${dir}" ls-files '**/*.tmLanguage.json' '**/*.YAML-tmLanguage')
}

generate_grammar_index() {
  local -a scope_names=("$@")
  echo "import path from 'node:path';"
  echo ""
  echo "const __dirname = path.dirname(new URL(import.meta.url).pathname);"
  echo ""
  echo "export default {"
  for scope_name in "${scope_names[@]}"
  do
    echo "    '${scope_name}': path.join(__dirname, '${scope_name}.json'),"
  done
  echo "};"
}

yaml2json() {
  python3 -c 'import sys, yaml, json; print(json.dumps(yaml.safe_load(sys.stdin.read()), indent=4))'
}

mkdir -p "${GRAMMARS_DIR}"

pull_source "https://github.com/microsoft/vscode.git" "${TMP_DIR}/vscode"
copy_syntaxes "${TMP_DIR}/vscode"

pull_source "https://github.com/JustusAdam/language-haskell.git" "${TMP_DIR}/language-haskell"
copy_syntaxes "${TMP_DIR}/language-haskell"

generate_grammar_index "${available_scopes[@]}" > "${GRAMMARS_DIR}/index.js"

echo ${#available_scopes[@]} grammars are copied.
