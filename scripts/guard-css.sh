#!/usr/bin/env bash
# NINETY CSS guard — fails the build on known dead patterns.
# Why: unlayered author CSS beats Tailwind v4 layered utilities at equal
# specificity, so layout lives in stylesheet classes. Never fight with `!`.
set -euo pipefail
fail=0
say() { echo "guard-css: $1"; }

if grep -rn --include='*.css' '!important' src 2>/dev/null | grep -vE 'animation(-duration)?[^:]*:|transition(-duration)?[^:]*:'; then
  say 'FAIL: `!important` found in src/*.css — move layout to stylesheet classes.'
  say '(allowed only: animation/transition overrides for reduced-motion/power modes)'
  fail=1
fi
if grep -rEn --include='*.{css,jsx,js}' 'neon|tinted-glass|glass-neon|!p-|!m-|!flex' src 2>/dev/null; then
  say 'FAIL: dead pattern (neon/tinted glass or `!` Tailwind override) found.'
  fail=1
fi
if grep -rEn --include='*.css' 'box-shadow:[^;]*#[0-9a-fA-F]{3,8}[^;]*box-shadow|text-shadow:[^;]*#[0-9a-fA-F]' src 2>/dev/null; then
  say 'NOTE: colored shadows need review (neutral glass only + one accent).'
fi
if [ "$fail" -eq 1 ]; then exit 1; fi
say 'OK'
