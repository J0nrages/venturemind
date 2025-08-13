#!/bin/bash
# Use expect or similar to handle interactive prompts
(
  echo ""  # New York style (first option, just press Enter)
  echo ""  # Neutral color (first option, just press Enter)  
  echo "y" # Use CSS variables
  echo "n" # No React Server Components
) | bunx shadcn@latest init
