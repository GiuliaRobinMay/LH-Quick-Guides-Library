#!/usr/bin/env python3
"""Kept for convenience: builds every library into dist/. Same as build_data.py."""
import runpy, os
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_data.py'), run_name='__main__')
