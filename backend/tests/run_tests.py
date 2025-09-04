#!/usr/bin/env python3
"""
Test runner for Iranian Legal Archive System
"""

import sys
import subprocess
import os
from pathlib import Path

def run_tests():
    """Run all tests with pytest"""
    # Add backend to Python path
    backend_path = Path(__file__).parent.parent
    sys.path.insert(0, str(backend_path))
    
    # Set environment variables for testing
    os.environ['PYTHONPATH'] = str(backend_path)
    os.environ['TESTING'] = 'true'
    
    # Run pytest with coverage
    cmd = [
        sys.executable, '-m', 'pytest',
        'backend/tests/',
        '-v',
        '--tb=short',
        '--cov=backend',
        '--cov-report=html',
        '--cov-report=term-missing',
        '--cov-fail-under=80'
    ]
    
    print("Running tests for Iranian Legal Archive System...")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, check=True)
        print("\n✅ All tests passed!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Tests failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print("❌ pytest not found. Please install it with: pip install pytest pytest-cov")
        return False

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)