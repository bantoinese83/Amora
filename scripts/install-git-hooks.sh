#!/bin/sh

# Install git hooks
# This script sets up the pre-push hook that runs type checks and builds before pushing

echo "🔧 Installing git hooks..."

# Get the root directory of the git repository
ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT_DIR" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

HOOKS_DIR="$ROOT_DIR/.git/hooks"
PRE_PUSH_HOOK="$HOOKS_DIR/pre-push"

# Check if hooks directory exists
if [ ! -d "$HOOKS_DIR" ]; then
    echo "❌ Error: .git/hooks directory not found"
    exit 1
fi

# Copy the pre-push hook
if [ -f "$ROOT_DIR/.git/hooks/pre-push" ]; then
    echo "✅ Pre-push hook already installed"
else
    # Create the hook from our template
    cat > "$PRE_PUSH_HOOK" << 'HOOK_EOF'
#!/bin/sh

# Git pre-push hook
# Runs type checking and builds for client and server before allowing push

echo "🔍 Running pre-push checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print error and exit
error_exit() {
    echo ""
    echo "${RED}❌ Pre-push checks failed!${NC}"
    echo "${RED}Push aborted. Please fix the errors above and try again.${NC}"
    exit 1
}

# Function to print success message
success() {
    echo "${GREEN}✅ $1${NC}"
}

# Function to print info message
info() {
    echo "${YELLOW}ℹ️  $1${NC}"
}

# Get the root directory of the git repository
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR" || exit 1

echo "📦 Step 1/4: Type checking client..."
if ! npm run type-check:client; then
    error_exit "Client type check failed"
fi
success "Client type check passed"

echo ""
echo "📦 Step 2/4: Type checking server..."
if ! npm run type-check:server; then
    error_exit "Server type check failed"
fi
success "Server type check passed"

echo ""
echo "🔨 Step 3/4: Building client..."
if ! npm run build:client; then
    error_exit "Client build failed"
fi
success "Client build passed"

echo ""
echo "🔨 Step 4/4: Building server..."
if ! npm run build:server; then
    error_exit "Server build failed"
fi
success "Server build passed"

echo ""
echo "${GREEN}✨ All pre-push checks passed! Proceeding with push...${NC}"
exit 0
HOOK_EOF

    chmod +x "$PRE_PUSH_HOOK"
    echo "✅ Pre-push hook installed successfully"
fi

echo ""
echo "✨ Git hooks installation complete!"
echo ""
echo "The pre-push hook will now automatically:"
echo "  1. Type check client code"
echo "  2. Type check server code"
echo "  3. Build client"
echo "  4. Build server"
echo ""
echo "If any step fails, the push will be aborted."

