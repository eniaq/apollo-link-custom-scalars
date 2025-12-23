# Contributing to apollo-link-custom-scalars

Thank you for your interest in contributing to apollo-link-custom-scalars!

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run tests to ensure everything is working:
   ```bash
   npm test
   ```

## Development

### Available Scripts

- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run build` - Build the library
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking

### Code Style

This project uses:
- [Prettier](https://prettier.io/) for code formatting
- [ESLint](https://eslint.org/) for linting
- [TypeScript](https://www.typescriptlang.org/) for type safety

Please ensure your code passes linting before submitting:
```bash
npm run lint
npm run typecheck
```

## Submitting Changes

### Pull Request Process

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Add or update tests as needed
4. Ensure all tests pass:
   ```bash
   npm test
   ```
5. Commit your changes with a clear message
6. Push to your fork and create a Pull Request

### Commit Messages

- Use clear, descriptive commit messages
- Reference related issues when applicable (e.g., "Fix #123")

## Reporting Issues

When reporting a bug, please include:

- A clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, Apollo Client version, etc.)
- Minimal reproduction code if possible

## Questions?

Feel free to open an issue for any questions or concerns.
