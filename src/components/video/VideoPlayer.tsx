
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  violations: string[];
}

interface Bookmark {
  timestamp: string;
  timeInSeconds: number;
  startTime: number; // 60 seconds before the violation
  description: string;
  timeRange: string; // Display range like "02:10 - 03:10"
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, violations }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Parse violations into bookmarks with time ranges
  useEffect(() => {
    const parseBookmarks = () => {
      const parsed = violations.map((violation) => {
        // Extract timestamp like [03:10] from the violation string
        const timestampMatch = violation.match(/\[(\d{2}):(\d{2})\]/);
        if (timestampMatch) {
          const minutes = parseInt(timestampMatch[1]);
          const seconds = parseInt(timestampMatch[2]);
          const timeInSeconds = minutes * 60 + seconds;
          const startTime = Math.max(0, timeInSeconds - 60); // Start 60 seconds before, but not negative
          const description = violation.replace(/\[\d{2}:\d{2}\]\s*/, '');
          
          // Format time range display
          const formatTimeForDisplay = (time: number) => {
            const mins = Math.floor(time / 60);
            const secs = Math.floor(time % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          };
          
          const timeRange = `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(timeInSeconds)}`;
          
          return {
            timestamp: `${timestampMatch[1]}:${timestampMatch[2]}`,
            timeInSeconds,
            startTime,
            description,
            timeRange
          };
        }
        return null;
      }).filter(Boolean) as Bookmark[];
      
      // Sort by timestamp
      parsed.sort((a, b) => a.timeInSeconds - b.timeInSeconds);
      setBookmarks(parsed);
    };

    parseBookmarks();
  }, [violations]);

  // Update current time and handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      setDuration(video.duration);
      setIsVideoLoaded(true);
    };
    const handleLoadedData = () => setIsVideoLoaded(true);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleLoadedData);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleLoadedData);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    // Seek to the start of the violation period (60 seconds before)
    seekTo(bookmark.startTime);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(video.currentTime + 10, duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(video.currentTime - 10, 0);
  };

  const isBookmarkActive = (bookmark: Bookmark) => {
    // Check if current time is within the violation range
    return currentTime >= bookmark.startTime && currentTime <= bookmark.timeInSeconds;
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full max-h-96"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        >
          <source src={videoUrl} type="video/webm" />
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          {/* Controls */}
          <div className="flex items-center justify-center text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={skipBackward}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                disabled={!isVideoLoaded}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={skipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading video...</div>
          </div>
        )}
      </div>

      {/* Bookmarks Panel */}
      {bookmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Violation Bookmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bookmarks.map((bookmark, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    isBookmarkActive(bookmark)
                      ? 'bg-red-50 border-red-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleBookmarkClick(bookmark)}
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={isBookmarkActive(bookmark) ? 'bg-red-100 text-red-800' : ''}
                    >
                      {bookmark.timeRange}
                    </Badge>
                    <span className="text-sm">{bookmark.description}</span>
                  </div>
                  {isBookmarkActive(bookmark) && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoPlayer;
