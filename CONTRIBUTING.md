# Contributing to Pimcore Cloud Storage Manager

Contributions, bug reports, and pull requests are welcome.

## Development Setup

1. Clone repository:
   ```bash
   git clone https://github.com/vezolabs/pimcore-cloud-storage-bundle.git
   cd pimcore-cloud-storage-bundle
   ```

2. Install dependencies:
   ```bash
   composer install
   ```

3. Validate package configuration:
   ```bash
   composer validate --strict
   ```

4. Run unit and integration tests:
   ```bash
   vendor/bin/phpunit -c phpunit.xml.dist
   ```

## Coding Standards

- Follow PSR-12 and strict PHP typing (`declare(strict_types=1);`).
- Add unit or integration tests for any new features or bug fixes.
- Ensure all tests pass with zero warnings, deprecations, or notices.
- Keep commits concise, imperative, and focused.
