#!/bin/bash

# Update visual regression baseline screenshots
# Run this after intentional UI changes

echo "🔄 Updating visual regression baseline screenshots..."
echo ""

# Check if tests directory exists
if [ ! -d "tests/visual" ]; then
  echo "❌ Error: tests/visual directory not found"
  echo "   Make sure you're in the project root directory"
  exit 1
fi

# Confirm action
read -p "⚠️  This will update ALL baseline screenshots. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted"
  exit 1
fi

# Remove old baseline
echo "🗑️  Removing old baseline screenshots..."
find tests -name "*-snapshots" -type d -exec rm -rf {} + 2>/dev/null

# Run tests to generate new baseline
echo "📸 Generating new baseline screenshots..."
npx playwright test tests/visual --update-snapshots

# Check if successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Baseline updated successfully!"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Review changes: git diff tests/"
  echo "   2. Commit: git add tests/*-snapshots/"
  echo "   3. Commit: git commit -m 'chore: update visual regression baseline'"
else
  echo ""
  echo "❌ Failed to update baseline"
  echo "   Check errors above and try again"
  exit 1
fi
