#!/bin/env bash

set -o errexit -o nounset

if [[ "${TRACE-0}" == "1" ]]
then
    set -o xtrace
fi

SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(dirname "${SCRIPT_PATH}")
VSCODE_DIR="${SCRIPT_DIR}/tmp/vscode"
GRAMMAR_DIR="${SCRIPT_DIR}/lib/grammars"

if [ ! -d "${VSCODE_DIR}" ]
then
  echo "Clone vscode repository..."
  git clone https://github.com/microsoft/vscode.git "${VSCODE_DIR}" --depth=1
  cd "${VSCODE_DIR}"
else
  echo "Checkout vscode..."
  cd "${VSCODE_DIR}"
  git checkout -f .
  git pull
fi

mkdir -p "${GRAMMAR_DIR}"

declare -a available_scopes

while read -r path
do
  scope_name=$(jq -r .scopeName "${path}")
  available_scopes+=("${scope_name}")
  cp -v "${path}" "${GRAMMAR_DIR}/${scope_name}.json"
done < <(git ls-files '**/*.tmLanguage.json')

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

generate_grammar_index "${available_scopes[@]}" > "${GRAMMAR_DIR}/index.js"

echo ${#available_scopes[@]} grammars are copied.
