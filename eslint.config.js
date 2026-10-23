import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  { ignores: ['dist/**', 'coverage/**', 'docs/**', 'wireframes/**', 'assets/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { parser: ts.parser },
    },
  },
  prettier,
])
