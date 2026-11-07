import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
    ignores: [
      '.next/**',
      'node_modules/**',
      '.agents/**',
      '.impeccable/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.ts', 'store/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react-icons',
                'react-icons/*',
                '@mui/*',
                'antd',
                '@chakra-ui/*',
                '@heroicons/*',
                '@tabler/icons-react',
                '@fortawesome/*',
              ],
              message: 'Use local shadcn/ui components and lucide-react icons.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    ignores: ['components/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@radix-ui/*'],
              message: 'Use the local shadcn/ui wrapper from components/ui.',
            },
            {
              group: [
                'react-icons',
                'react-icons/*',
                '@mui/*',
                'antd',
                '@chakra-ui/*',
                '@heroicons/*',
                '@tabler/icons-react',
                '@fortawesome/*',
              ],
              message: 'Use local shadcn/ui components and lucide-react icons.',
            },
          ],
        },
      ],
    },
  },
];
