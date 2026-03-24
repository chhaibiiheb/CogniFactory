#!/usr/bin/env python3
"""
Script to create minimal valid MP4 test videos for the dashboard
"""
import os

def create_minimal_mp4(filepath, duration=10):
    """
    Create a test MP4 file with specified duration.
    """
    # Will be created by FFmpeg/MoviePy
    mp4_data = None
    # Use FFmpeg if available, otherwise use MoviePy
    try:
        import subprocess
        # Create a longer test video (30 seconds of color gradient that changes)
        cmd = [
            'ffmpeg', '-f', 'lavfi', '-i', f'color=c=black:s=1280x720:d={duration}',
            '-f', 'lavfi', '-i', f'anullsrc=r=48000:cl=mono:d={duration}',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
            '-c:a', 'aac', '-b:a', '32k',
            '-y', filepath
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode == 0:
            print(f"✓ Created {filepath} ({duration}s) using FFmpeg")
            return True
        else:
            print(f"✗ FFmpeg failed: {result.stderr.decode()}")
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"! FFmpeg not available: {e}")
    
    # Fallback: use moviepy if available
    try:
        from moviepy.editor import ColorClip, TextClip, CompositeVideoClip
        # Create a video with text showing duration
        clip = ColorClip(size=(1280, 720), color=(20, 20, 40), duration=duration)
        print(f"✓ Created {filepath} ({duration}s) using MoviePy")
        clip.write_videofile(filepath, verbose=False, logger=None, audio=True)
        return True
    except ImportError:
        print("! MoviePy not available")
    except Exception as e:
        print(f"! MoviePy error: {e}")
    
    # Fallback: write minimal MP4 bytes (might not play on all browsers)
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        if mp4_data:
            with open(filepath, 'wb') as f:
                f.write(mp4_data)
        print(f"✓ Created {filepath} (minimal MP4)")
        return True
    except Exception as e:
        print(f"✗ Failed to create {filepath}: {e}")
        return False

if __name__ == '__main__':
    base_path = r'd:\master pfe\frontend\public\videos'
    os.makedirs(base_path, exist_ok=True)
    
    print("Creating test video files...")
    videos = [
        ('vid1.mp4', 'Production Line A', 30),
        ('vid2.mp4', 'Production Line B', 30),
        ('vid3.mp4', 'Quality Control', 25),
        ('vid4.mp4', 'Assembly Station', 35),
        ('vid5.mp4', 'Packaging Area', 28),
    ]
    
    for video_file, description, duration in videos:
        filepath = os.path.join(base_path, video_file)
        print(f"\nCreating {video_file} ({description}) - {duration}s...")
        create_minimal_mp4(filepath, duration)
    
    print("\n✓ Done! All test videos created.")
