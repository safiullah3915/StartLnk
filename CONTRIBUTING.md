# Contributing to Startup Sales & Purchase Platform

Thank you for your interest in contributing to this Final Year Project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main` or `develop`
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following the coding standards below
5. **Test your changes** thoroughly
6. **Commit your changes** with clear messages
7. **Push to your fork**
8. **Create a Pull Request** with a detailed description

## Development Setup

Follow the README.md to set up your development environment with all three services running.

## Coding Standards

### Python
- Follow PEP 8 style guide
- Use meaningful variable names
- Add docstrings to functions and classes
- Keep functions focused and small
- Use type hints where appropriate

### JavaScript/React
- Use ES6+ features
- Follow ESLint configuration
- Use meaningful component and variable names
- Add JSDoc comments for complex functions
- Keep components small and reusable

### General
- Write clean, readable code
- Add comments for complex logic
- Avoid hardcoding values; use configuration
- Test edge cases

## Testing

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
cd frontend
npm test
```

Ensure all tests pass before submitting a Pull Request.

## Git Workflow

### Branch Naming
- Feature: `feature/feature-name`
- Bug fix: `bugfix/bug-description`
- Hotfix: `hotfix/hotfix-description`

### Commit Messages
```
[TYPE] Short description (50 chars max)

Optional detailed explanation of changes.
- Point 1
- Point 2

Fixes #issue-number (if applicable)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build, dependencies, etc.

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Provide clear description of changes
6. Link related issues
7. Request review from maintainers

## Areas for Contribution

### High Priority
- Improving recommendation accuracy
- Performance optimization
- Bug fixes
- Documentation enhancements

### Nice to Have
- UI/UX improvements
- Additional features
- Better error handling
- Additional test coverage

## Reporting Issues

When reporting bugs:
1. Use a clear, descriptive title
2. Provide detailed steps to reproduce
3. Include expected vs actual behavior
4. Add relevant logs or screenshots
5. Mention your environment (OS, Python version, etc.)

## Questions?

- Check existing documentation
- Review closed issues and PRs
- Ask in GitHub discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing! 🎉
